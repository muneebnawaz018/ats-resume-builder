"use client";

import { memo, useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Collapse from "@mui/material/Collapse";
import type { Resume } from "@/schema";
import { itemSummary } from "./ItemEditor";
import { PanelLabel } from "./PanelLabel";
import { v } from "@/ui/theme/vars";

/**
 * Structure at a glance, not a form. Selecting a section here focuses it on
 * the paper; the fields themselves live in the inspector.
 */
function OutlineRailInner({
  resume,
  selectedPath,
  onSelect,
  onToggleVisible,
  onAddSection,
}: {
  resume: Resume;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onToggleVisible: (id: string) => void;
  onAddSection: () => void;
}) {
  /*
   * Sections start closed. The rail is for finding your way around, and a
   * fully expanded tree of every entry is longer than the rail is tall, which
   * makes it worse at that job rather than better.
   */
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) =>
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <Box
      component="nav"
      aria-label="Resume outline"
      data-chrome
      sx={{
        width: 220,
        flexShrink: 0,
        borderRight: `1px solid ${v.edge}`,
        bgcolor: v.surface0,
        /*
         * The rail is navigation, and every section it lists can also be
         * reached by clicking it in the document. Below a laptop width the
         * space is better spent on the page itself.
         */
        display: { xs: "none", lg: "flex" },
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <PanelLabel
        sx={{ px: 1.5, pt: 1.75, pb: 1 }}
        count={String(resume.sections.length)}
      >
        Outline
      </PanelLabel>

      <Box sx={{ flex: 1, overflowY: "auto", px: 0.75 }}>
        <List dense disablePadding>
          <ListItem disablePadding sx={{ mb: 0.25 }}>
            <ListItemButton
              selected={selectedPath === "basics"}
              onClick={() => onSelect("basics")}
              sx={{ py: 0.5, pl: 1 }}
            >
              <ListItemText
                primary="Name and contact"
                slotProps={{ primary: { sx: { fontSize: 13 } } }}
              />
            </ListItemButton>
          </ListItem>

          {resume.sections.map((s, i) => {
            const path = `sections[${i}]`;
            const isOpen = open[s.id] ?? false;
            return (
              <Box key={`g-${s.id}`}>
              <ListItem
                key={s.id}
                disablePadding
                sx={{ mb: 0.25 }}
                secondaryAction={
                  <Tooltip title={s.visible ? "Hide section" : "Show section"}>
                    <IconButton
                      edge="end"
                      aria-label={
                        s.visible
                          ? `Hide ${s.title} section`
                          : `Show ${s.title} section`
                      }
                      onClick={() => onToggleVisible(s.id)}
                    >
                      {s.visible ? (
                        <VisibilityIcon sx={{ fontSize: 15 }} />
                      ) : (
                        <VisibilityOffIcon sx={{ fontSize: 15 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton
                  selected={selectedPath === path}
                  onClick={() => onSelect(path)}
                  sx={{ py: 0.5, pl: 0.5, opacity: s.visible ? 1 : 0.45 }}
                >
                  {/*
                    Its own control, not part of selecting the section: opening
                    a section to look inside it and moving the editor to it are
                    different intentions, and one should not force the other.
                  */}
                  <IconButton
                    size="small"
                    aria-label={
                      isOpen ? `Collapse ${s.title}` : `Expand ${s.title}`
                    }
                    aria-expanded={isOpen}
                    disabled={s.items.length === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(s.id);
                    }}
                    sx={{ p: 0.25, mr: 0.25 }}
                  >
                    <ChevronRightIcon
                      sx={{
                        fontSize: 16,
                        color: s.items.length ? v.text3 : "transparent",
                        transform: isOpen ? "rotate(90deg)" : "none",
                        transition: "transform 160ms ease-out",
                      }}
                    />
                  </IconButton>
                  <ListItemText
                    primary={s.title}
                    secondary={`${s.items.length} ${s.items.length === 1 ? "entry" : "entries"}`}
                    slotProps={{
                      primary: { noWrap: true, sx: { fontSize: 13 } },
                      secondary: { sx: { fontSize: 11, color: v.text3 } },
                    }}
                  />
                </ListItemButton>
              </ListItem>

              <Collapse in={isOpen} unmountOnExit>
                <List dense disablePadding sx={{ mb: 0.5 }}>
                  {s.items.map((item, j) => {
                    const itemPath = `sections[${i}].items[${j}]`;
                    return (
                      <ListItem key={item.id} disablePadding>
                        <ListItemButton
                          selected={selectedPath === itemPath}
                          onClick={() => onSelect(itemPath)}
                          sx={{ py: 0.25, pl: 4, pr: 1 }}
                        >
                          <ListItemText
                            primary={itemSummary(s.type, item) || "Untitled"}
                            slotProps={{
                              primary: {
                                noWrap: true,
                                sx: { fontSize: 12, color: v.text2 },
                              },
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
              </Box>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 1, borderTop: `1px solid ${v.edge}` }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={onAddSection}
        >
          Add section
        </Button>
      </Box>
    </Box>
  );
}

/** Memoised: an edit in the inspector must not re-render the chrome. */
export const OutlineRail = memo(OutlineRailInner);
