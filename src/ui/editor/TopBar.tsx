"use client";

import RedoIcon from "@mui/icons-material/Redo";
import UndoIcon from "@mui/icons-material/Undo";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { ink } from "../theme/palette";
import type { ViewMode } from "@/store/useAppStore";

export function TopBar({
  name,
  view,
  zoom,
  canUndo,
  canRedo,
  onView,
  onZoom,
  onUndo,
  onRedo,
  onExport,
}: {
  name: string;
  view: ViewMode;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onView: (v: ViewMode) => void;
  onZoom: (z: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
}) {
  return (
    <Box
      component="header"
      sx={{
        height: 44,
        flexShrink: 0,
        px: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderBottom: `1px solid ${ink[700]}`,
        bgcolor: ink[800],
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 500, mr: 1 }}>
        {name}
      </Typography>

      <Tooltip title="Undo">
        <span>
          <IconButton onClick={onUndo} disabled={!canUndo} aria-label="Undo">
            <UndoIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Redo">
        <span>
          <IconButton onClick={onRedo} disabled={!canRedo} aria-label="Redo">
            <RedoIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Box sx={{ flex: 1 }} />

      {/*
        The signature control. Flipping to Parse shows what an extractor
        recovered from the document — the product's argument, on the user's
        own file. See docs/09-design.md.
      */}
      <ToggleButtonGroup
        exclusive
        size="small"
        value={view}
        onChange={(_, v: ViewMode | null) => v && onView(v)}
        aria-label="Document view"
      >
        <ToggleButton value="reading">Reading</ToggleButton>
        <ToggleButton value="parse">Parse</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
        <Tooltip title="Zoom out">
          <IconButton
            onClick={() => onZoom(zoom - 0.1)}
            aria-label="Zoom out"
          >
            <ZoomOutIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
        <Typography
          sx={{
            fontFamily: "var(--font-plex-mono), monospace",
            fontSize: 11,
            color: ink[300],
            width: 38,
            textAlign: "center",
          }}
        >
          {Math.round(zoom * 100)}%
        </Typography>
        <Tooltip title="Zoom in">
          <IconButton onClick={() => onZoom(zoom + 0.1)} aria-label="Zoom in">
            <ZoomInIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Button variant="contained" onClick={onExport} sx={{ ml: 1 }}>
        Export PDF
      </Button>
    </Box>
  );
}
