"use client";

import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { tone } from "@/ui/tokens";
import { useReveal } from "./useReveal";
import { ContentPanel } from "./ContentPanel";

/*
 * The design panel carries ~35 controls and is only reachable behind a tab, so
 * it is split out of the initial editor bundle rather than paid for up front.
 */
const DesignPanel = dynamic(
  () => import("@/ui/design").then((m) => m.DesignPanel),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ p: 2.5, fontSize: 12.5, color: tone.text3 }}>
        Loading design controls…
      </Box>
    ),
  },
);
import { type Resume, type Theme, type ThemeTokens } from "@/schema";
import type { PanelTab } from "@/store";

/** Placeholder that directs rather than decorates. */
function Pending({ title, body }: { title: string; body: string }) {
  return (
    <Box sx={{ p: 2.5 }}>
      <Typography sx={{ fontSize: 13, mb: 0.75 }}>{title}</Typography>
      <Typography sx={{ fontSize: 12, color: tone.text3, lineHeight: 1.6 }}>
        {body}
      </Typography>
    </Box>
  );
}

export function Inspector({
  tab,
  onTab,
  resume,
  selectedPath,
  theme,
  safeMode,
  onToken,
  onThemeChange,
}: {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  resume: Resume;
  selectedPath: string | null;
  theme: Theme;
  safeMode: boolean;
  onToken: <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => void;
  onThemeChange: (id: string) => void;
}) {
  /*
   * Clicking a line on the page has to move the panel to the control that
   * edits it, or the click reads as doing nothing.
   */
  const scroller = useRef<HTMLDivElement>(null);
  useReveal(tab === "content" ? selectedPath : null, scroller);

  return (
    <Box
      component="aside"
      aria-label="Inspector"
      data-chrome
      sx={{
        /*
         * On a phone the inspector is the editor, the preview is what gets
         * hidden, not the controls. It takes the full width there and becomes
         * a fixed side panel from tablet up.
         */
        width: { xs: "100%", sm: 320 },
        flexShrink: 0,
        borderLeft: { xs: "none", sm: `1px solid ${tone.line1}` },
        bgcolor: tone.surface0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, v: PanelTab) => onTab(v)}
        variant="fullWidth"
        sx={{ borderBottom: `1px solid ${tone.line1}` }}
      >
        <Tab label="Content" value="content" />
        <Tab label="Design" value="design" />
        <Tab label="Checks" value="checks" />
      </Tabs>

      <Box ref={scroller} sx={{ flex: 1, overflowY: "auto" }}>
        {tab === "design" ? (
          <DesignPanel
            theme={theme}
            safeMode={safeMode}
            onToken={onToken}
            onThemeChange={onThemeChange}
          />
        ) : tab === "content" ? (
          <ContentPanel resume={resume} selectedPath={selectedPath} />
        ) : (
          <Pending
            title="Checks arrive in Phase 3."
            body="Each finding will name the specific instance and what to do about it, not a rule id and not a score on its own."
          />
        )}
      </Box>
    </Box>
  );
}
