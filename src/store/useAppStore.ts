"use client";

import { create } from "zustand";
import {
  produce,
  type Patch,
  applyPatches,
  enablePatches,
  setAutoFreeze,
} from "immer";
import { newId } from "@/lib/id";
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from "@/schema/builtinThemes";
import { tryLoadResume, tryLoadTheme } from "@/schema/migrate";
import { createItem } from "@/schema/factory";
import { createSampleResume } from "@/schema/sample";
import type { Resume, Section } from "@/schema/resume";
import type { Theme, ThemeTokens } from "@/schema/theme";
import { db, isDbAvailable } from "./db";
import { readSession, writeSession } from "./session";

enablePatches();
// The state tree is rewritten on every keystroke; freezing it each time is
// measurable work for no benefit, since all writes go through immer anyway.
setAutoFreeze(false);

/** Undo/redo stores immer patches, not snapshots — bounded history, and the
 *  same patches feed the version-diff view later. */
type HistoryEntry = { undo: Patch[]; redo: Patch[]; key?: string; at: number };
const HISTORY_LIMIT = 100;

/**
 * Consecutive edits to the same field within this window merge into one
 * history entry, so Ctrl+Z undoes a phrase rather than a single character.
 */
const COALESCE_MS = 700;

export type PanelTab = "content" | "design" | "checks";
export type ViewMode = "reading" | "parse";

type State = {
  resumes: Record<string, Resume>;
  themes: Record<string, Theme>;
  activeResumeId: string | null;

  ui: {
    selectedPath: string | null;
    panel: PanelTab;
    view: ViewMode;
    zoom: number;
    safeMode: boolean;
  };

  past: HistoryEntry[];
  future: HistoryEntry[];

  hydrated: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  lastSavedAt: string | null;
};

type Actions = {
  hydrate: () => Promise<void>;

  activeResume: () => Resume | null;
  activeTheme: () => Theme;

  editResume: (recipe: (r: Resume) => void, coalesceKey?: string) => void;
  editTheme: (recipe: (t: ThemeTokens) => void, coalesceKey?: string) => void;
  setThemeById: (themeId: string) => void;

  addSection: (type: Section["type"], title: string) => void;
  removeSection: (id: string) => void;
  moveSection: (from: number, to: number) => void;
  toggleSectionVisible: (id: string) => void;
  renameSection: (id: string, title: string) => void;

  addItem: (sectionId: string) => void;
  updateItem: (
    sectionId: string,
    itemId: string,
    patch: Record<string, unknown>,
  ) => void;
  removeItem: (sectionId: string, itemId: string) => void;
  duplicateItem: (sectionId: string, itemId: string) => void;
  moveItem: (sectionId: string, from: number, to: number) => void;

  updateBasics: (patch: Partial<Resume["basics"]>) => void;
  addLink: () => void;
  updateLink: (id: string, patch: Partial<Resume["basics"]["links"][number]>) => void;
  removeLink: (id: string) => void;

  setResumeName: (name: string) => void;

  select: (path: string | null) => void;
  setPanel: (p: PanelTab) => void;
  setView: (v: ViewMode) => void;
  setZoom: (z: number) => void;

  undo: () => void;
  redo: () => void;
};

const themeMap = (list: Theme[]): Record<string, Theme> =>
  Object.fromEntries(list.map((t) => [t.id, t]));

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useAppStore = create<State & Actions>((set, get) => {
  /** Debounced write. Persistence must never sit on the input path. */
  function scheduleSave() {
    if (!isDbAvailable()) return;
    if (saveTimer) clearTimeout(saveTimer);
    set({ saveState: "saving" });
    saveTimer = setTimeout(() => {
      const s = get();
      const r = s.activeResumeId ? s.resumes[s.activeResumeId] : null;
      const work: Promise<void>[] = [];
      if (r) work.push(db.putResume(r));
      const t = s.themes[r?.themeId ?? DEFAULT_THEME_ID];
      if (t && !t.builtin) work.push(db.putTheme(t));
      Promise.all(work)
        .then(() =>
          set({ saveState: "saved", lastSavedAt: new Date().toISOString() }),
        )
        .catch(() => set({ saveState: "error" }));
    }, 500);
  }

  /**
   * Applies a recipe, records patches for undo, and schedules a save.
   *
   * `coalesceKey` identifies the field being edited. Consecutive edits to the
   * same key merge into the previous history entry instead of pushing a new
   * one — without this, undo steps backwards one character at a time.
   */
  function commit(recipe: (s: State) => void, coalesceKey?: string) {
    const undoPatches: Patch[] = [];
    const redoPatches: Patch[] = [];
    const next = produce(get() as State, recipe, (p, inv) => {
      redoPatches.push(...p);
      undoPatches.push(...inv);
    });
    if (redoPatches.length === 0) return;

    const now = Date.now();
    const past = [...get().past];
    const last = past[past.length - 1];

    if (
      coalesceKey &&
      last &&
      last.key === coalesceKey &&
      now - last.at < COALESCE_MS
    ) {
      past[past.length - 1] = {
        key: coalesceKey,
        at: now,
        redo: [...last.redo, ...redoPatches],
        // Inverse patches apply in reverse order.
        undo: [...undoPatches, ...last.undo],
      };
    } else {
      past.push({ undo: undoPatches, redo: redoPatches, key: coalesceKey, at: now });
    }

    set({ ...next, past: past.slice(-HISTORY_LIMIT), future: [] });
    scheduleSave();
  }

  return {
    resumes: {},
    themes: themeMap(BUILTIN_THEMES),
    activeResumeId: null,
    ui: {
      selectedPath: null,
      panel: "content",
      view: "reading",
      zoom: 1,
      safeMode: true,
    },
    past: [],
    future: [],
    hydrated: false,
    saveState: "idle",
    lastSavedAt: null,

    async hydrate() {
      if (get().hydrated) return;

      const themes = themeMap(BUILTIN_THEMES);
      const resumes: Record<string, Resume> = {};

      if (isDbAvailable()) {
        try {
          for (const raw of await db.allThemes()) {
            const res = tryLoadTheme(raw);
            if (res.ok) themes[res.theme.id] = res.theme;
          }
          for (const raw of await db.allResumes()) {
            const res = tryLoadResume(raw);
            // A corrupt or future-version document is skipped rather than
            // allowed to crash the editor.
            if (res.ok) resumes[res.resume.id] = res.resume;
          }
        } catch {
          // Private browsing or a blocked store: fall through to in-memory.
        }
      }

      /*
       * Reopen where you left off. The stored id wins if that document still
       * exists; otherwise fall back to the most recently edited one, which is
       * a better guess than whichever id happens to sort first.
       */
      const session = readSession();
      let activeResumeId =
        session.activeResumeId && resumes[session.activeResumeId]
          ? session.activeResumeId
          : (Object.values(resumes).sort((a, b) =>
              b.updatedAt.localeCompare(a.updatedAt),
            )[0]?.id ?? null);

      if (!activeResumeId) {
        const id = newId("r");
        resumes[id] = createSampleResume(id, new Date().toISOString());
        activeResumeId = id;
        if (isDbAvailable()) void db.putResume(resumes[id]);
      }

      set((s) => ({
        themes,
        resumes,
        activeResumeId,
        hydrated: true,
        ui: {
          ...s.ui,
          panel: (session.panel as State["ui"]["panel"]) ?? s.ui.panel,
          view: (session.view as State["ui"]["view"]) ?? s.ui.view,
          zoom: session.zoom ?? s.ui.zoom,
        },
      }));
      writeSession({ activeResumeId });
    },

    activeResume() {
      const { activeResumeId, resumes } = get();
      return activeResumeId ? (resumes[activeResumeId] ?? null) : null;
    },

    activeTheme() {
      const r = get().activeResume();
      return (
        get().themes[r?.themeId ?? DEFAULT_THEME_ID] ??
        get().themes[DEFAULT_THEME_ID]
      );
    },

    editResume(recipe, coalesceKey) {
      const id = get().activeResumeId;
      if (!id) return;
      commit((s) => {
        const r = s.resumes[id];
        if (!r) return;
        recipe(r);
        r.updatedAt = new Date().toISOString();
      }, coalesceKey);
    },

    editTheme(recipe, coalesceKey) {
      const r = get().activeResume();
      if (!r) return;
      const current = get().themes[r.themeId];
      if (!current) return;

      // Built-ins are read-only: editing one forks a copy owned by the user.
      if (current.builtin) {
        const forkId = newId("t");
        commit((s) => {
          const fork: Theme = {
            ...current,
            id: forkId,
            name: `${current.name} (edited)`,
            builtin: false,
            tokens: { ...current.tokens },
          };
          recipe(fork.tokens);
          s.themes[forkId] = fork;
          const res = s.resumes[r.id];
          if (res) res.themeId = forkId;
        });
        return;
      }

      commit((s) => {
        const t = s.themes[current.id];
        if (t) recipe(t.tokens);
      }, coalesceKey);
    },

    setThemeById(themeId) {
      get().editResume((r) => {
        r.themeId = themeId;
      });
    },

    addSection(type, title) {
      get().editResume((r) => {
        r.sections.push({
          id: newId("s"),
          type,
          title,
          visible: true,
          items: [],
        });
      });
    },

    removeSection(id) {
      get().editResume((r) => {
        r.sections = r.sections.filter((s) => s.id !== id);
      });
    },

    moveSection(from, to) {
      get().editResume((r) => {
        if (from === to) return;
        const [moved] = r.sections.splice(from, 1);
        if (moved) r.sections.splice(to, 0, moved);
      });
    },

    toggleSectionVisible(id) {
      get().editResume((r) => {
        const s = r.sections.find((x) => x.id === id);
        if (s) s.visible = !s.visible;
      });
    },

    renameSection(id, title) {
      get().editResume(
        (r) => {
          const s = r.sections.find((x) => x.id === id);
          if (s) s.title = title;
        },
        `sectionTitle:${id}`,
      );
    },

    addItem(sectionId) {
      get().editResume((r) => {
        const s = r.sections.find((x) => x.id === sectionId);
        if (s) s.items.push(createItem(s.type));
      });
    },

    updateItem(sectionId, itemId, patch) {
      get().editResume(
        (r) => {
          const s = r.sections.find((x) => x.id === sectionId);
          const item = s?.items.find((i) => i.id === itemId);
          if (item) Object.assign(item, patch);
        },
        `item:${sectionId}:${itemId}:${Object.keys(patch).join(",")}`,
      );
    },

    removeItem(sectionId, itemId) {
      get().editResume((r) => {
        const s = r.sections.find((x) => x.id === sectionId);
        if (s) s.items = s.items.filter((i) => i.id !== itemId);
      });
    },

    duplicateItem(sectionId, itemId) {
      get().editResume((r) => {
        const s = r.sections.find((x) => x.id === sectionId);
        if (!s) return;
        const idx = s.items.findIndex((i) => i.id === itemId);
        const item = s.items[idx];
        if (!item) return;
        s.items.splice(idx + 1, 0, {
          ...structuredClone(item),
          id: newId("i"),
        });
      });
    },

    moveItem(sectionId, from, to) {
      get().editResume((r) => {
        const s = r.sections.find((x) => x.id === sectionId);
        if (!s || from === to || to < 0 || to >= s.items.length) return;
        const [moved] = s.items.splice(from, 1);
        if (moved) s.items.splice(to, 0, moved);
      });
    },

    updateBasics(patch) {
      get().editResume(
        (r) => {
          Object.assign(r.basics, patch);
        },
        `basics:${Object.keys(patch).join(",")}`,
      );
    },

    addLink() {
      get().editResume((r) => {
        r.basics.links.push({
          id: newId("l"),
          label: "",
          url: "",
          displayAs: "url",
        });
      });
    },

    updateLink(id, patch) {
      get().editResume(
        (r) => {
          const l = r.basics.links.find((x) => x.id === id);
          if (l) Object.assign(l, patch);
        },
        `link:${id}:${Object.keys(patch).join(",")}`,
      );
    },

    removeLink(id) {
      get().editResume((r) => {
        r.basics.links = r.basics.links.filter((l) => l.id !== id);
      });
    },

    setResumeName(name) {
      get().editResume((r) => {
        r.name = name;
      }, "resumeName");
    },

    select(path) {
      set((s) => ({ ui: { ...s.ui, selectedPath: path } }));
    },
    setPanel(panel) {
      set((s) => ({ ui: { ...s.ui, panel } }));
      writeSession({ panel });
    },
    setView(view) {
      set((s) => ({ ui: { ...s.ui, view } }));
      writeSession({ view });
    },
    setZoom(zoom) {
      const z = Math.min(2, Math.max(0.4, zoom));
      set((s) => ({ ui: { ...s.ui, zoom: z } }));
      writeSession({ zoom: z });
    },

    undo() {
      const { past } = get();
      const entry = past[past.length - 1];
      if (!entry) return;
      set({
        ...applyPatches(get() as State, entry.undo),
        past: past.slice(0, -1),
        future: [entry, ...get().future],
      });
      scheduleSave();
    },

    redo() {
      const [entry, ...rest] = get().future;
      if (!entry) return;
      set({
        ...applyPatches(get() as State, entry.redo),
        past: [...get().past, entry],
        future: rest,
      });
      scheduleSave();
    },
  };
});
