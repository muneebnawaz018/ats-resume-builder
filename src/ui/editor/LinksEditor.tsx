"use client";

import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import LanguageIcon from "@mui/icons-material/Language";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  LINK_PLATFORMS,
  WEBSITE_PLATFORM,
  classifyLink,
  linkText,
  normaliseLinkInput,
  platformById,
  type Resume,
} from "@/schema";
import { useAppStore } from "@/store";
import { tone } from "@/ui/tokens";

type Link = Resume["basics"]["links"][number];

/**
 * Wordmarks for the platform picker.
 *
 * Two letters in the platform's own colour, drawn with CSS rather than
 * imported as brand logos. This is editor chrome and never reaches the
 * document: see the note on the display control below for why the page
 * itself stays text-only.
 */
const MARKS: Record<string, { short: string; color: string }> = {
  linkedin: { short: "in", color: "#0A66C2" },
  github: { short: "gh", color: "#24292F" },
  gitlab: { short: "gl", color: "#FC6D26" },
  stackoverflow: { short: "so", color: "#F48024" },
  scholar: { short: "gs", color: "#4285F4" },
  orcid: { short: "id", color: "#A6CE39" },
  x: { short: "X", color: "#000000" },
  dribbble: { short: "dr", color: "#EA4C89" },
  behance: { short: "be", color: "#1769FF" },
  medium: { short: "md", color: "#000000" },
  kaggle: { short: "kg", color: "#20BEFF" },
  youtube: { short: "yt", color: "#FF0000" },
};

function PlatformMark({ id, size = 22 }: { id?: string; size?: number }) {
  const mark = id ? MARKS[id] : undefined;
  if (!mark) {
    return (
      <LanguageIcon sx={{ fontSize: size, color: tone.text3, flexShrink: 0 }} />
    );
  }
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "5px",
        bgcolor: mark.color,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.46,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: "-0.02em",
      }}
    >
      {mark.short}
    </Box>
  );
}

function LinkRow({
  link,
  index,
  count,
}: {
  link: Link;
  index: number;
  count: number;
}) {
  const s = useAppStore.getState();
  const platform = platformById(link.platform) ?? classifyLink(link.url);
  const [menu, setMenu] = useState<HTMLElement | null>(null);

  /** Retyping the address should re-label it, unless a label was chosen. */
  const onUrl = (raw: string) => {
    const detected = classifyLink(raw);
    const wasDefault = !link.label || link.label === platform.label;
    s.updateLink(link.id, {
      url: raw,
      ...(wasDefault && detected.id !== platform.id
        ? { platform: detected.id, label: detected.label }
        : {}),
    });
  };

  return (
    <Box
      sx={{
        border: `1px solid ${tone.line1}`,
        borderRadius: 1.5,
        p: 1.25,
        mb: 1.25,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Tooltip title="Change what this link points to">
          <IconButton
            onClick={(e) => setMenu(e.currentTarget)}
            aria-label={`Change platform, currently ${platform.label}`}
            sx={{ p: 0.5 }}
          >
            <PlatformMark id={platform.id} />
          </IconButton>
        </Tooltip>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 600,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {platform.label}
        </Typography>

        <Tooltip title="Move up">
          <span>
            <IconButton
              size="small"
              disabled={index === 0}
              onClick={() => s.moveLink(index, index - 1)}
              aria-label="Move link up"
            >
              <ArrowUpwardIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton
              size="small"
              disabled={index === count - 1}
              onClick={() => s.moveLink(index, index + 1)}
              aria-label="Move link down"
            >
              <ArrowDownwardIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Remove link">
          <IconButton
            size="small"
            onClick={() => s.removeLink(link.id)}
            aria-label={`Remove ${platform.label}`}
          >
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {[...LINK_PLATFORMS, WEBSITE_PLATFORM].map((p) => (
          <MenuItem
            key={p.id}
            selected={p.id === platform.id}
            onClick={() => {
              const wasDefault = !link.label || link.label === platform.label;
              s.updateLink(link.id, {
                platform: p.id,
                ...(wasDefault ? { label: p.label } : {}),
              });
              setMenu(null);
            }}
            sx={{ gap: 1.25, fontSize: 13 }}
          >
            <PlatformMark id={p.id} size={18} />
            {p.label}
          </MenuItem>
        ))}
      </Menu>

      <TextField
        label="Address"
        value={link.url}
        onChange={(e) => onUrl(e.target.value)}
        onBlur={() =>
          s.updateLink(link.id, {
            url: normaliseLinkInput(link.url, platform),
          })
        }
        placeholder={platform.placeholder}
        fullWidth
        size="small"
        sx={{ mb: 1 }}
      />
      <TextField
        label="Label"
        value={link.label}
        onChange={(e) => s.updateLink(link.id, { label: e.target.value })}
        placeholder={platform.label}
        fullWidth
        size="small"
        sx={{ mb: 1 }}
      />

      <ToggleButtonGroup
        exclusive
        size="small"
        value={link.displayAs}
        onChange={(_, v) => v && s.updateLink(link.id, { displayAs: v })}
        aria-label="How this link appears on the page"
        sx={{ mb: 0.75 }}
      >
        <ToggleButton value="url" sx={{ fontSize: 11, py: 0.4, px: 1 }}>
          Address
        </ToggleButton>
        <ToggleButton value="both" sx={{ fontSize: 11, py: 0.4, px: 1 }}>
          Label and address
        </ToggleButton>
        <ToggleButton value="label" sx={{ fontSize: 11, py: 0.4, px: 1 }}>
          Label only
        </ToggleButton>
      </ToggleButtonGroup>

      <Typography sx={{ fontSize: 11.5, color: tone.text3, lineHeight: 1.5 }}>
        On the page:{" "}
        <Box component="span" sx={{ color: tone.text2 }}>
          {linkText(link) || "nothing yet"}
        </Box>
        {link.displayAs === "label" ? (
          <Box component="span" sx={{ display: "block", mt: 0.25 }}>
            The address is not printed, so a parser cannot recover it.
          </Box>
        ) : null}
      </Typography>
    </Box>
  );
}

/**
 * The links block of the Content panel.
 *
 * Split out of ContentPanel because it grew a picker, ordering and a per-link
 * display control, and the basics editor was becoming hard to read.
 */
export function LinksEditor({ links }: { links: Link[] }) {
  const s = useAppStore.getState();
  const [addMenu, setAddMenu] = useState<HTMLElement | null>(null);
  const used = new Set(links.map((l) => l.platform));

  return (
    <Box>
      {links.map((l, i) => (
        <LinkRow key={l.id} link={l} index={i} count={links.length} />
      ))}

      <Button
        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
        onClick={(e) => setAddMenu(e.currentTarget)}
      >
        Add link
      </Button>
      <Menu
        anchorEl={addMenu}
        open={Boolean(addMenu)}
        onClose={() => setAddMenu(null)}
      >
        {[...LINK_PLATFORMS, WEBSITE_PLATFORM].map((p) => (
          <MenuItem
            key={p.id}
            onClick={() => {
              s.addLink(p.id);
              setAddMenu(null);
            }}
            sx={{ gap: 1.25, fontSize: 13 }}
          >
            <PlatformMark id={p.id} size={18} />
            {p.label}
            {used.has(p.id) && p.id !== WEBSITE_PLATFORM.id ? (
              <Box component="span" sx={{ ml: "auto", color: tone.text4, fontSize: 11 }}>
                added
              </Box>
            ) : null}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
