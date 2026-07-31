"use client";

import { create } from "zustand";
import {
  produce,
  type Patch,
  applyPatches,
  enablePatches,
  setAutoFreeze,
} from "immer";
import { newId, takeHandoff } from "@/lib";
import { BUILTIN_THEMES, DEFAULT_THEME_ID, createItem, createSampleResume, platformById, tryLoadResume, tryLoadTheme, type Resume, type Section, type Theme, type ThemeTokens } from "@/schema";
import { db, isDbAvailable, requestPersistentStorage } from "./db";
import { readSession, writeSession } from "./session";

enablePatches();
// The state tree is rewritten on every keystroke; freezing it each time is
// measurable work for no benefit, since all writes go through immer anyway.
setAutoFreeze(false);

/** Undo/redo stores immer patches, not snapshots, bounded history, and the
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
  /**
   * Picks up a document handed over from the checker, if there is one.
   *
   * Separate from hydrate because the store is module level and outlives
   * client-side navigation: somebody who opened the editor once, went to the
   * checker and came back is already hydrated, and used to land on whatever
   * they had before while their parsed file was dropped on the floor.
   *
   * Returns whether a document was imported.
   */
  importHandoff: () => boolean;

  activeResume: () => Resume | null;
  activeTheme: () => Theme;

  editResume: (recipe: (r: Resume) => void, coalesceKey?: string) => void;
  editTheme: (recipe: (t: ThemeTokens) => void, coalesceKey?: string) => void;
  setThemeById: (themeId: string) => void;

  /** The active document and its theme, as a plain object safe to serialise. */
  exportDocument: () => { version: 1; resume: Resume; theme: Theme } | null;
  /** Loads a previously exported file. Returns an error message on failure. */
  importDocument: (raw: unknown) => { ok: true } | { ok: false; error: string };

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
  /** `platformId` seeds the label and is remembered for the editor's hints. */
  addLink: (platformId?: string) => void;
  updateLink: (id: string, patch: Partial<Resume["basics"]["links"][number]>) => void;
  removeLink: (id: string) => void;
  moveLink: (from: number, to: number) => void;

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
/** Set by the store so a page-hide can force the pending write through. */
let flushSave: (() => void) | null = null;
/** The hydration in progress, so a second caller joins it instead of racing. */
let inFlightHydrate: Promise<void> | null = null;

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

  /*
   * A debounce means there is always a window, up to half a second of typing,
   *that exists only in memory. Closing the tab inside it lost the edit
   * silently, which for a resume is the worst kind of bug. Run the pending
   * write immediately when the page is being hidden or torn down.
   */
  flushSave = () => {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    const s = get();
    const r = s.activeResumeId ? s.resumes[s.activeResumeId] : null;
    if (r) void db.putResume(r);
    const t = s.themes[r?.themeId ?? DEFAULT_THEME_ID];
    if (t && !t.builtin) void db.putTheme(t);
  };

  /**
   * Applies a recipe, records patches for undo, and schedules a save.
   *
   * `coalesceKey` identifies the field being edited. Consecutive edits to the
   * same key merge into the previous history entry instead of pushing a new
   * one, without this, undo steps backwards one character at a time.
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

  /**
   * One hydration pass.
   *
   * Private to the factory: nothing outside can start a second one,
   * which is the whole point of the guard in hydrate().
   */
  async function hydrateOnce(): Promise<void> {
    /*
     * The handed-over document is collected before anything is awaited, so
     * it cannot be lost to a concurrent reader between the check and the
     * read.
     */
    const handed = takeHandoff();

    const themes = themeMap(BUILTIN_THEMES);
    const resumes: Record<string, Resume> = {};

    if (isDbAvailable()) {
      // Ask once per load, and never wait on the answer: it only affects
      // whether the browser may evict this origin under disk pressure.
      void requestPersistentStorage();
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

    /*
     * A document handed over from the checker takes precedence over the
     * session: the person just chose a file and pressed a button, so that
     * is what they expect to be looking at.
     *
     * Checked before the sample is seeded, not after. Seeding first left a
     * stray untouched sample in the list on every checker handoff, which is
     * clutter nobody asked for.
     */
    const imported = handed ? tryLoadResume(handed) : null;

    if (imported?.ok) {
      resumes[imported.resume.id] = imported.resume;
      activeResumeId = imported.resume.id;
      if (isDbAvailable()) void db.putResume(imported.resume);
    } else if (!activeResumeId) {
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
      /*
       * Already hydrated means a return visit to the editor within one page
       * load, which is exactly the checker handoff path. Nothing else needs
       * doing, but the handed-over document still has to be collected.
       */
      if (get().hydrated) {
        get().importHandoff();
        return;
      }

      /*
       * One pass at a time.
       *
       * The `hydrated` check above is not a lock: the body awaits IndexedDB,
       * and a second caller arriving during that await saw `hydrated` still
       * false and started its own pass. Both then raced to the end, but only
       * the first found the handoff, since taking it clears it. When the
       * empty-handed pass wrote last it reinstated the previously open
       * document, so choosing a file in the checker landed on the resume
       * before it. Effects run twice in development, so this was the common
       * case rather than the rare one.
       */
      if (!inFlightHydrate) {
        inFlightHydrate = hydrateOnce().finally(() => {
          inFlightHydrate = null;
        });
      }
      return inFlightHydrate;
    },

    importHandoff() {
      const handed = takeHandoff();
      if (!handed) return false;

      const res = tryLoadResume(handed);
      // A document the schema rejects is left alone rather than replacing
      // whatever the person already had open.
      if (!res.ok) return false;

      set((s) => ({
        resumes: { ...s.resumes, [res.resume.id]: res.resume },
        activeResumeId: res.resume.id,
        // The imported document is a fresh start, so nothing before it is
        // meaningful to undo back into.
        past: [],
        future: [],
      }));
      if (isDbAvailable()) void db.putResume(res.resume);
      writeSession({ activeResumeId: res.resume.id });
      return true;
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

    exportDocument() {
      const resume = get().activeResume();
      if (!resume) return null;
      const theme = get().activeTheme();
      return { version: 1, resume, theme };
    },

    /*
     * Import goes through the same migration and validation path as a document
     * read from IndexedDB, an edited or hand-written file cannot put invalid
     * state into the store, and an older export is migrated forward.
     *
     * The document arrives with a new id so importing never overwrites what
     * you already have open.
     */
    importDocument(raw) {
      if (typeof raw !== "object" || raw === null) {
        return { ok: false, error: "That file is not a resume export." };
      }
      const payload = raw as { resume?: unknown; theme?: unknown };
      const parsed = tryLoadResume(payload.resume ?? raw);
      if (!parsed.ok) {
        return {
          ok: false,
          error: "That file could not be read as a resume.",
        };
      }

      const id = newId("r");
      const resume: Resume = {
        ...parsed.resume,
        id,
        name: `${parsed.resume.name} (imported)`,
        updatedAt: new Date().toISOString(),
      };

      let themeId = resume.themeId;
      const themeResult = payload.theme
        ? tryLoadTheme(payload.theme)
        : { ok: false as const };
      if (themeResult.ok && !get().themes[themeResult.theme.id]) {
        const theme = themeResult.theme;
        themeId = theme.id;
        set((s) => ({ themes: { ...s.themes, [theme.id]: theme } }));
        if (isDbAvailable() && !theme.builtin) void db.putTheme(theme);
      } else if (!get().themes[themeId]) {
        // The file referenced a theme we do not have; fall back rather than
        // render a document with no styling at all.
        themeId = DEFAULT_THEME_ID;
      }

      set((s) => ({
        resumes: { ...s.resumes, [id]: { ...resume, themeId } },
        activeResumeId: id,
        past: [],
        future: [],
      }));
      writeSession({ activeResumeId: id });
      if (isDbAvailable()) void db.putResume({ ...resume, themeId });
      return { ok: true };
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

    addLink(platformId) {
      const platform = platformById(platformId);
      get().editResume((r) => {
        r.basics.links.push({
          id: newId("l"),
          label: platform?.label ?? "",
          url: "",
          displayAs: "url",
          platform: platform?.id,
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

    moveLink(from, to) {
      get().editResume((r) => {
        const links = r.basics.links;
        if (to < 0 || to >= links.length || from === to) return;
        const [moved] = links.splice(from, 1);
        links.splice(to, 0, moved);
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

/*
 * `pagehide` fires on tab close, navigation and mobile app-switching, where
 * `beforeunload` is unreliable; `visibilitychange` covers backgrounding.
 */
if (typeof document !== "undefined") {
  const flush = () => flushSave?.();
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
