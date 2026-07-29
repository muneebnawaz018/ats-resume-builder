"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { plainText } from "@/schema/common";
import type { ThemeTokens } from "@/schema/theme";
import { useAppStore } from "@/store/useAppStore";
import { ink } from "../theme/palette";
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
          bgcolor: ink[900],
        }}
      >
        <Typography sx={{ fontSize: 13, color: ink[500] }}>
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
          onSelect={useAppStore.getState().select}
          onToggleVisible={useAppStore.getState().toggleSectionVisible}
          onAddSection={() =>
            useAppStore.getState().addSection("text", "New section")
          }
        />

        {ui.view === "reading" ? (
          <PaperStage
            resume={resume}
            theme={theme}
            zoom={ui.zoom}
            selectedPath={ui.selectedPath}
            onSelect={useAppStore.getState().select}
            onPageCount={setPages}
          />
        ) : (
          <ParseView resume={resume} />
        )}

        <Inspector
          tab={ui.panel}
          onTab={useAppStore.getState().setPanel}
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
    </Box>
  );
}
