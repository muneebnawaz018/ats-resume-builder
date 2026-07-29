"use client";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { Length } from "@/schema/common";
import { tone } from "../theme/tokens";

/** Label left, control right, measured value in mono. */
function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          mb: 0.5,
        }}
      >
        <Typography sx={{ fontSize: 12, color: tone.text2 }}>{label}</Typography>
        {value ? (
          <Typography
            sx={{
              fontFamily: "var(--font-plex-mono), monospace",
              fontSize: 11,
              color: tone.text3,
            }}
          >
            {value}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}

export function LengthControl({
  label,
  value,
  min,
  max,
  step = 0.5,
  onChange,
}: {
  label: string;
  value: Length;
  min: number;
  max: number;
  step?: number;
  onChange: (next: Length) => void;
}) {
  return (
    <Row label={label} value={`${value.value}${value.unit}`}>
      <Slider
        value={value.value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={(_, v) =>
          onChange({ ...value, value: Array.isArray(v) ? v[0] : v })
        }
      />
    </Row>
  );
}

export function NumberControl({
  label,
  value,
  min,
  max,
  step = 0.01,
  format = (v: number) => v.toFixed(2),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (next: number) => void;
}) {
  return (
    <Row label={label} value={format(value)}>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={(_, v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </Row>
  );
}

export function SelectControl<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
  helper,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (next: T) => void;
  disabled?: boolean;
  helper?: string;
}) {
  return (
    <Row label={label}>
      <Select
        value={value}
        size="small"
        fullWidth
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        sx={{ fontSize: 13 }}
        inputProps={{ "aria-label": label }}
      >
        {options.map((o) => (
          <MenuItem key={String(o.value)} value={o.value} sx={{ fontSize: 13 }}>
            {o.label}
          </MenuItem>
        ))}
      </Select>
      {helper ? (
        <Typography sx={{ fontSize: 11, color: tone.text3, mt: 0.5 }}>
          {helper}
        </Typography>
      ) : null}
    </Row>
  );
}

export function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Row label={label} value={value}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Box
          component="input"
          type="color"
          value={value}
          aria-label={label}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
          sx={{
            width: 34,
            height: 30,
            p: 0,
            border: `1px solid ${tone.line2}`,
            borderRadius: "3px",
            bgcolor: tone.surface1,
            cursor: "pointer",
          }}
        />
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{
            htmlInput: {
              "aria-label": `${label} hex value`,
              style: { fontFamily: "var(--font-plex-mono), monospace" },
            },
          }}
        />
      </Box>
    </Row>
  );
}

export function SwitchControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 1,
      }}
    >
      <Typography sx={{ fontSize: 12, color: tone.text2 }}>{label}</Typography>
      <Switch
        size="small"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        slotProps={{ input: { "aria-label": label } }}
      />
    </Box>
  );
}

export function TextControl({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  mono?: boolean;
}) {
  return (
    <Row label={label}>
      <TextField
        value={value}
        fullWidth
        onChange={(e) => onChange(e.target.value)}
        slotProps={{
          htmlInput: {
            "aria-label": label,
            style: mono
              ? { fontFamily: "var(--font-plex-mono), monospace" }
              : undefined,
          },
        }}
      />
    </Row>
  );
}

export function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{
        display: "block",
        color: tone.text3,
        mt: 2,
        mb: 1,
        pb: 0.5,
        borderBottom: `1px solid ${tone.line1}`,
      }}
    >
      {children}
    </Typography>
  );
}
