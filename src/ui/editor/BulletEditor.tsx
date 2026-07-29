"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { plainText, richText, type RichText } from "@/schema/common";
import { severity, tone } from "../theme/tokens";

const LONG_BULLET = 220;

/**
 * Bullets are edited as plain text. The rich text model allows bold, italic
 * and links, but a toolbar per bullet would be noise — inline marks arrive in
 * a later pass and the stored shape already supports them.
 */
export function BulletEditor({
  bullets,
  onChange,
  label = "Bullet points",
  help,
}: {
  bullets: RichText[];
  onChange: (next: RichText[]) => void;
  label?: string;
  help?: string;
}) {
  const set = (i: number, text: string) => {
    const next = [...bullets];
    next[i] = richText(text);
    onChange(next);
  };

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= bullets.length) return;
    const next = [...bullets];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontSize: 12, color: tone.text2, mb: 0.25 }}>
        {label}
      </Typography>
      {help ? (
        <Typography sx={{ fontSize: 11.5, color: tone.text3, mb: 1 }}>
          {help}
        </Typography>
      ) : null}

      {bullets.map((b, i) => {
        const text = plainText(b);
        const tooLong = text.length > LONG_BULLET;
        return (
          <Box key={i} sx={{ display: "flex", gap: 0.5, mb: 0.75 }}>
            <TextField
              value={text}
              onChange={(e) => set(i, e.target.value)}
              multiline
              fullWidth
              placeholder="Start with a verb, and include a number where you can."
              helperText={
                tooLong
                  ? `${text.length} characters — long bullets get skimmed. Two lines is the usual limit.`
                  : undefined
              }
              slotProps={{
                formHelperText: { sx: { color: severity.caution } },
                htmlInput: { "aria-label": `Bullet ${i + 1}` },
              }}
            />
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Tooltip title="Move up">
                <span>
                  <IconButton
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={`Move bullet ${i + 1} up`}
                  >
                    <ArrowUpwardIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Move down">
                <span>
                  <IconButton
                    disabled={i === bullets.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move bullet ${i + 1} down`}
                  >
                    <ArrowDownwardIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Delete bullet">
                <IconButton
                  onClick={() => onChange(bullets.filter((_, j) => j !== i))}
                  aria-label={`Delete bullet ${i + 1}`}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        );
      })}

      <Button
        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
        onClick={() => onChange([...bullets, richText("")])}
      >
        Add bullet
      </Button>
    </Box>
  );
}
