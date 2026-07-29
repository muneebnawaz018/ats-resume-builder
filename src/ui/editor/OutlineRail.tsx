"use client";

import { memo } from "react";

import AddIcon from "@mui/icons-material/Add";
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
import type { Resume } from "@/schema/resume";
import { tone } from "../theme/tokens";

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
  return (
    <Box
      component="nav"
      aria-label="Resume outline"
      data-chrome
      sx={{
        width: 220,
        flexShrink: 0,
        borderRight: `1px solid ${tone.line1}`,
        bgcolor: tone.surface0,
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
      <Typography
        variant="overline"
        sx={{ px: 1.75, pt: 1.75, pb: 1, color: tone.text3 }}
      >
        Outline
      </Typography>

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
            return (
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
                  <DragIndicatorIcon
                    sx={{ fontSize: 15, color: tone.line2, mr: 0.5 }}
                  />
                  <ListItemText
                    primary={s.title}
                    secondary={`${s.items.length} item${s.items.length === 1 ? "" : "s"}`}
                    slotProps={{
                      primary: { noWrap: true, sx: { fontSize: 13 } },
                      secondary: { sx: { fontSize: 11, color: tone.text3 } },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 1, borderTop: `1px solid ${tone.line1}` }}>
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
