"use client";

import { memo, useRef, useState } from "react";

import MoreVertIcon from "@mui/icons-material/MoreVert";
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
import InputBase from "@mui/material/InputBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { tone } from "@/ui/tokens";
import type { ViewMode } from "@/store";

function TopBarInner({
  name,
  onRename,
  view,
  zoom,
  canUndo,
  canRedo,
  onView,
  onZoom,
  onUndo,
  onRedo,
  onExport,
  onExportJson,
  onImportJson,
}: {
  name: string;
  onRename: (name: string) => void;
  view: ViewMode;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onView: (v: ViewMode) => void;
  onZoom: (z: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
}) {
  const [menuAt, setMenuAt] = useState<HTMLElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Box
      component="header"
      data-chrome
      sx={{
        height: 44,
        flexShrink: 0,
        px: 1.5,
        // Nothing in the bar may widen the editor past the viewport.
        minWidth: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderBottom: `1px solid ${tone.line1}`,
        bgcolor: tone.surface0,
      }}
    >
      {/* The document name is editable in place — there was no other way to
          rename a resume. */}
      <Tooltip title="Rename this resume">
        <InputBase
          value={name}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Untitled resume"
          inputProps={{ "aria-label": "Resume name" }}
          sx={{
            fontSize: 13,
            fontWeight: 500,
            mr: 1,
            px: 0.75,
            borderRadius: "3px",
            border: "1px solid transparent",
            "&:hover": { borderColor: tone.line2 },
            "&.Mui-focused": { borderColor: tone.line2, bgcolor: tone.surface1 },
            /*
             * Flexible, not fixed. At 320px a fixed 120px name field plus the
             * buttons added up to more than the viewport and scrolled the
             * editor sideways.
             */
            flex: { xs: 1, sm: "none" },
            minWidth: 0,
            width: { xs: "auto", sm: 200 },
          }}
        />
      </Tooltip>

      <Tooltip title="Undo (Ctrl+Z)">
        <span>
          <IconButton onClick={onUndo} disabled={!canUndo} aria-label="Undo">
            <UndoIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Redo (Ctrl+Shift+Z)">
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
        sx={{ display: { xs: "none", sm: "inline-flex" } }}
        value={view}
        onChange={(_, v: ViewMode | null) => v && onView(v)}
        aria-label="Document view"
      >
        <Tooltip title="The page as a person reads it">
          <ToggleButton value="reading">Reading</ToggleButton>
        </Tooltip>
        <Tooltip title="The fields a parser recovers from it">
          <ToggleButton value="parse">Parse</ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>

      {/* Both control the preview, which is hidden on phones. */}
      <Box
        sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", ml: 1 }}
      >
        <Tooltip title="Zoom out">
          <IconButton
            onClick={() => onZoom(zoom - 0.1)}
            aria-label="Zoom out"
          >
            <ZoomOutIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset zoom">
          <Box
            component="button"
            onClick={() => onZoom(1)}
            aria-label="Reset zoom to 100%"
            sx={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 11,
              color: tone.text2,
              width: 44,
              textAlign: "center",
              border: "none",
              bgcolor: "transparent",
              cursor: "pointer",
              py: 0.5,
            }}
          >
            {Math.round(zoom * 100)}%
          </Box>
        </Tooltip>
        <Tooltip title="Zoom in">
          <IconButton onClick={() => onZoom(zoom + 0.1)} aria-label="Zoom in">
            <ZoomInIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Tooltip title="Opens your browser's print dialog. Choose “Save as PDF”.">
        <Button
          variant="contained"
          onClick={onExport}
          sx={{ ml: 1, flexShrink: 0, px: { xs: 1.5, sm: 2 } }}
        >
          {/* "PDF" alone on a phone bar; the tooltip carries the rest. */}
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            Export&nbsp;
          </Box>
          PDF
        </Button>
      </Tooltip>

      {/*
        JSON in and out. This is what makes the document portable: it can leave
        as a file you own and come back later, or on another machine.
      */}
      <Tooltip title="More">
        <IconButton
          aria-label="More actions"
          aria-haspopup="menu"
          onClick={(e) => setMenuAt(e.currentTarget)}
          sx={{ ml: 0.25, flexShrink: 0 }}
        >
          <MoreVertIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={menuAt}
        open={Boolean(menuAt)}
        onClose={() => setMenuAt(null)}
      >
        <MenuItem
          onClick={() => {
            setMenuAt(null);
            onExportJson();
          }}
        >
          Save a JSON backup
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAt(null);
            fileRef.current?.click();
          }}
        >
          Open a JSON backup
        </MenuItem>
      </Menu>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so choosing the same file twice still fires a change event.
          e.target.value = "";
          if (file) onImportJson(file);
        }}
      />
    </Box>
  );
}

/** Memoised: an edit in the inspector must not re-render the chrome. */
export const TopBar = memo(TopBarInner);
