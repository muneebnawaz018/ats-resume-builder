"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { plainText } from "@/schema/common";
import type { ThemeTokens } from "@/schema/theme";
import { useAppStore } from "@/store/useAppStore";
import { tone } from "../theme/tokens";
import { AddSectionDialog } from "./AddSectionDialog";
import { Inspector } from "./Inspector";
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
  const resumes = useAppStore((s) => s.resumes);
  const activeResumeId = useAppStore((s) => s.activeResumeId);
  const themes = useAppStore((s) => s.themes);
  const ui = useAppStore((s) => s.ui);
  const past = useAppStore((s) => s.past);
  const future = useAppStore((s) => s.future);
  const saveState = useAppStore((s) => s.saveState);
  const lastSavedAt = useAppStore((s) => s.lastSavedAt);

  const [pages, setPages] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  /** Clicking the page opens that part in the Content tab, not just a highlight. */
  const selectAndEdit = useCallback((path: string) => {
    const s = useAppStore.getState();
    s.select(path);
    s.setPanel("content");
  }, []);

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

  const resume = activeResumeId ? resumes[activeResumeId] : null;
  const theme = resume ? themes[resume.themeId] : null;

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
      useAppStore.getState().editTheme((t) => {
        t[key] = value;
      });
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
      <TopBar
        name={resume.name}
        view={ui.view}
        zoom={ui.zoom}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onView={useAppStore.getState().setView}
        onZoom={useAppStore.getState().setZoom}
        onUndo={useAppStore.getState().undo}
        onRedo={useAppStore.getState().redo}
        onExport={() => window.print()}
      />

      <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
        <OutlineRail
          resume={resume}
          selectedPath={ui.selectedPath}
          onSelect={selectAndEdit}
          onToggleVisible={useAppStore.getState().toggleSectionVisible}
          onAddSection={() => setAddOpen(true)}
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
          onTab={useAppStore.getState().setPanel}
          resume={resume}
          selectedPath={ui.selectedPath}
          theme={theme}
          safeMode={ui.safeMode}
          onToken={setToken}
          onThemeChange={useAppStore.getState().setThemeById}
        />
      </Box>

      <StatusBar
        pages={pages}
        words={words}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
      />

      <AddSectionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(type, title) => {
          const s = useAppStore.getState();
          s.addSection(type, title);
          const r = s.activeResume();
          if (r) {
            s.select(`sections[${r.sections.length - 1}]`);
            s.setPanel("content");
          }
        }}
      />
    </Box>
  );
}
