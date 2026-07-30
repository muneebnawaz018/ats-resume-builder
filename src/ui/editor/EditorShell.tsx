"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import type { ExportFormat } from "@/export";
import { downloadJson, readJsonFile, slugify } from "@/lib";
import { plainText, type ThemeTokens } from "@/schema";
import { useAppStore } from "@/store";
import { tone } from "@/ui/tokens";
import { AddSectionDialog } from "./AddSectionDialog";
import { Inspector } from "./Inspector";
import { PrintPageSize } from "./PrintPageSize";
import { OutlineRail } from "./OutlineRail";
import { PaperStage } from "./PaperStage";
import { ParseView } from "./ParseView";
import { StatusBar } from "./StatusBar";
import { TopBar } from "./TopBar";

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function EditorShell() {
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);
  // Subscribe to the active document, not the whole map, otherwise every
  // keystroke notifies on an object identity nothing here reads.
  const resume = useAppStore((s) =>
    s.activeResumeId ? (s.resumes[s.activeResumeId] ?? null) : null,
  );
  const theme = useAppStore((s) =>
    resume ? (s.themes[resume.themeId] ?? null) : null,
  );
  const ui = useAppStore((s) => s.ui);
  const canUndo = useAppStore((s) => s.past.length > 0);
  const canRedo = useAppStore((s) => s.future.length > 0);
  const saveState = useAppStore((s) => s.saveState);
  const lastSavedAt = useAppStore((s) => s.lastSavedAt);

  const [pages, setPages] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  /** Clicking the page opens that part in the Content tab, not just a highlight. */
  const selectAndEdit = useCallback((path: string | null) => {
    const s = useAppStore.getState();
    s.select(path);
    // Clearing the selection should not also yank the panel to Content.
    if (path !== null) s.setPanel("content");
  }, []);

  /*
   * Stable handler identities. The chrome components are memoised, and an
   * inline arrow would hand them a new prop on every keystroke, defeating it.
   */
  const openAdd = useCallback(() => setAddOpen(true), []);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  /*
   * Export always prints the document, never the parse list.
   *
   * Parse view replaces the page in the layout, so printing from it produced a
   * PDF of recovered field names, a broken file, silently. Flip back to the
   * page first and let it paint before handing off to the print engine.
   */
  const doPrint = useCallback(() => {
    if (useAppStore.getState().ui.view !== "reading") {
      useAppStore.getState().setView("reading");
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
      return;
    }
    window.print();
  }, []);
  /*
   * Word, OpenDocument, rich text, plain text, Markdown. The writers are
   * imported here rather than at module scope so the editor loads without
   * the zip encoder, most sessions end in a print, not a download.
   */
  const doExportFile = useCallback(async (format: ExportFormat) => {
    const resume = useAppStore.getState().activeResume();
    if (!resume) return;
    const { download } = await import("@/export");
    await download(resume, format);
  }, []);

  const doExportJson = useCallback(() => {
    const doc = useAppStore.getState().exportDocument();
    if (!doc) return;
    downloadJson(`${slugify(doc.resume.name)}.json`, doc);
  }, []);

  const doImportJson = useCallback(async (file: File) => {
    try {
      const raw = await readJsonFile(file);
      const res = useAppStore.getState().importDocument(raw);
      if (!res.ok) setImportError(res.error);
    } catch {
      setImportError("That file is not valid JSON.");
    }
  }, []);

  const store = useAppStore.getState();
  const handlers = useMemo(
    () => ({
      setView: store.setView,
      setZoom: store.setZoom,
      undo: store.undo,
      redo: store.redo,
      setPanel: store.setPanel,
      toggleSectionVisible: store.toggleSectionVisible,
      setThemeById: store.setThemeById,
      setResumeName: store.setResumeName,
    }),
    [store],
  );

  const addSection = useCallback(
    (type: Parameters<typeof store.addSection>[0], title: string) => {
      const s = useAppStore.getState();
      s.addSection(type, title);
      const r = s.activeResume();
      if (r) {
        s.select(`sections[${r.sections.length - 1}]`);
        s.setPanel("content");
      }
    },
    [],
  );

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Undo/redo are the two shortcuts people try first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) useAppStore.getState().redo();
      else useAppStore.getState().undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const words = useMemo(() => {
    if (!resume) return 0;
    let n = countWords(
      [resume.basics.fullName, resume.basics.headline].filter(Boolean).join(" "),
    );
    if (resume.basics.summary) n += countWords(plainText(resume.basics.summary));
    for (const s of resume.sections) {
      if (!s.visible) continue;
      for (const item of s.items) {
        for (const v of Object.values(item as Record<string, unknown>)) {
          if (typeof v === "string") n += countWords(v);
          else if (Array.isArray(v)) {
            for (const e of v) {
              if (typeof e === "string") n += countWords(e);
              else if (e && typeof e === "object" && "spans" in e) {
                n += countWords(plainText(e as never));
              }
            }
          }
        }
      }
    }
    return n;
  }, [resume]);

  const setToken = useCallback(
    <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => {
      // Coalesced per token, so dragging a slider is one undo step.
      useAppStore.getState().editTheme((t) => {
        t[key] = value;
      }, `token:${String(key)}`);
    },
    [],
  );

  if (!hydrated || !resume || !theme) {
    return (
      <Box
        sx={{
          height: "100dvh",
          display: "grid",
          placeItems: "center",
          bgcolor: tone.surface1,
        }}
      >
        <Typography sx={{ fontSize: 13, color: tone.text3 }}>
          Loading your documents from this browser…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* The paper the export lands on, which otherwise follows the printer. */}
      <PrintPageSize pageSize={theme.tokens.pageSize} />

      <TopBar
        name={resume.name}
        view={ui.view}
        zoom={ui.zoom}
        canUndo={canUndo}
        canRedo={canRedo}
        onView={handlers.setView}
        onZoom={handlers.setZoom}
        onRename={handlers.setResumeName}
        onUndo={handlers.undo}
        onRedo={handlers.redo}
        onExport={doPrint}
        onExportFile={doExportFile}
        onExportJson={doExportJson}
        onImportJson={doImportJson}
      />

      <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
        <OutlineRail
          resume={resume}
          selectedPath={ui.selectedPath}
          onSelect={selectAndEdit}
          onToggleVisible={handlers.toggleSectionVisible}
          onAddSection={openAdd}
        />

        {ui.view === "reading" ? (
          <PaperStage
            resume={resume}
            theme={theme}
            zoom={ui.zoom}
            selectedPath={ui.selectedPath}
            onSelect={selectAndEdit}
            onPageCount={setPages}
          />
        ) : (
          <ParseView resume={resume} />
        )}

        <Inspector
          tab={ui.panel}
          onTab={handlers.setPanel}
          resume={resume}
          selectedPath={ui.selectedPath}
          theme={theme}
          safeMode={ui.safeMode}
          onToken={setToken}
          onThemeChange={handlers.setThemeById}
        />
      </Box>

      <StatusBar
        pages={pages}
        words={words}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
      />

      <AddSectionDialog open={addOpen} onClose={closeAdd} onAdd={addSection} />

      {/* Import is the one action that can fail on input the user chose. */}
      <Snackbar
        open={Boolean(importError)}
        autoHideDuration={6000}
        onClose={() => setImportError(null)}
        message={importError ?? ""}
      />
    </Box>
  );
}
