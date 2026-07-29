"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tone } from "../theme/tokens";

/** Anything the machine measured is set in mono. */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", gap: 0.75, alignItems: "baseline" }}>
      <Typography sx={{ fontSize: 11, color: tone.text3 }}>{label}</Typography>
      <Typography
        sx={{
          fontFamily: "var(--font-plex-mono), monospace",
          fontSize: 11,
          color: tone.text2,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function StatusBar({
  pages,
  words,
  saveState,
  lastSavedAt,
}: {
  pages: number;
  words: number;
  saveState: "idle" | "saving" | "saved" | "error";
  lastSavedAt: string | null;
}) {
  const saved =
    saveState === "saving"
      ? "saving"
      : saveState === "error"
        ? "not saved"
        : lastSavedAt
          ? new Date(lastSavedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";

  return (
    <Box
      component="footer"
      sx={{
        height: 26,
        flexShrink: 0,
        px: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 2.5,
        borderTop: `1px solid ${tone.line1}`,
        bgcolor: tone.surface0,
      }}
    >
      <Metric label="pages" value={String(pages)} />
      <Metric label="words" value={String(words)} />
      <Metric label="saved" value={saved} />
      <Box sx={{ flex: 1 }} />
      {/* Stated once, then never explained again. */}
      <Typography sx={{ fontSize: 11, color: tone.line2 }}>
        guides never print
      </Typography>
      <Typography sx={{ fontSize: 11, color: tone.line2 }}>
        stored in this browser only
      </Typography>
    </Box>
  );
}
