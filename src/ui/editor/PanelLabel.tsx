"use client";

import Box from "@mui/material/Box";
import { monoLabel, v } from "@/ui/theme/vars";

/**
 * The header on a panel, a rail, or a group of controls.
 *
 * A mono label with a hairline running from the words out to the edge of
 * whatever contains it. The same object appears on every panel in the checker
 * console and above every section on the marketing pages, and it is the thing
 * that makes a column of panels read as one instrument rather than as a stack
 * of unrelated boxes.
 *
 * `count` is for a measured figure that belongs to the header: "6 sections",
 * "3 of 5". It sits after the rule, on the far right, because it is the answer
 * to the label rather than part of it.
 */
export function PanelLabel({
  children,
  count,
  sx,
}: {
  children: React.ReactNode;
  count?: string;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        ...monoLabel,
        ...sx,
      }}
    >
      <span>{children}</span>
      <Box sx={{ flex: 1, height: "1px", bgcolor: v.edge }} />
      {count ? <Box component="span" sx={{ color: v.text4 }}>{count}</Box> : null}
    </Box>
  );
}
