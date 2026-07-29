"use client";

import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { DesignPanel } from "../design/DesignPanel";
import { ink } from "../theme/palette";
import type { Theme, ThemeTokens } from "@/schema/theme";
import type { PanelTab } from "@/store/useAppStore";

/** Placeholder that directs rather than decorates. */
function Pending({ title, body }: { title: string; body: string }) {
  return (
    <Box sx={{ p: 2.5 }}>
      <Typography sx={{ fontSize: 13, mb: 0.75 }}>{title}</Typography>
      <Typography sx={{ fontSize: 12, color: ink[500], lineHeight: 1.6 }}>
        {body}
      </Typography>
    </Box>
  );
}

export function Inspector({
  tab,
  onTab,
  theme,
  safeMode,
  onToken,
  onThemeChange,
}: {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  theme: Theme;
  safeMode: boolean;
  onToken: <K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) => void;
  onThemeChange: (id: string) => void;
}) {
  return (
    <Box
      component="aside"
      aria-label="Inspector"
      sx={{
        width: 320,
        flexShrink: 0,
        borderLeft: `1px solid ${ink[700]}`,
        bgcolor: ink[800],
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, v: PanelTab) => onTab(v)}
        variant="fullWidth"
        sx={{ borderBottom: `1px solid ${ink[700]}` }}
      >
        <Tab label="Content" value="content" />
        <Tab label="Design" value="design" />
        <Tab label="Checks" value="checks" />
      </Tabs>

      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {tab === "design" ? (
          <DesignPanel
            theme={theme}
            safeMode={safeMode}
            onToken={onToken}
            onThemeChange={onThemeChange}
          />
        ) : tab === "content" ? (
          <Pending
            title="Content editing arrives in Phase 1."
            body="Selecting text on the page will open its fields here, and editing a field will highlight the matching text on the page."
          />
        ) : (
          <Pending
            title="Checks arrive in Phase 3."
            body="Each finding will name the specific instance and what to do about it — not a rule id, and not a score on its own."
          />
        )}
      </Box>
    </Box>
  );
}
