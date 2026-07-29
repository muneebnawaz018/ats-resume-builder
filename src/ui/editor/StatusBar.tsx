"use client";

import { memo } from "react";

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
          fontFamily: "var(--font-mono), monospace",
          fontSize: 11,
          color: tone.text2,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function StatusBarInner({
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
      data-chrome
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
      <Typography
        sx={{ fontSize: 11, color: tone.line2, display: { xs: "none", md: "block" } }}
      >
        guides never print
      </Typography>
      {/*
        The privacy claim belongs here, where the work actually happens and
        the reassurance is worth something — not in a marketing footer.
      */}
      <Typography
        sx={{
          fontSize: 11,
          color: tone.line2,
          display: { xs: "none", sm: "block" },
          whiteSpace: "nowrap",
        }}
      >
        your resume stays in this browser · no account, ever
      </Typography>
    </Box>
  );
}

/** Memoised: an edit in the inspector must not re-render the chrome. */
export const StatusBar = memo(StatusBarInner);
