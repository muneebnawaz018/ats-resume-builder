"use client";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { DateEnd, DateValue } from "@/schema";
import { tone } from "@/ui/tokens";

/** Labelled text input. `help` explains why the field matters, not what it is. */
export function Field({
  label,
  value,
  onChange,
  help,
  placeholder,
  multiline,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helperText={help}
      placeholder={placeholder}
      multiline={multiline}
      minRows={rows}
      fullWidth
      sx={{ mb: 1.75 }}
    />
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const YEARS = Array.from({ length: 60 }, (_, i) => new Date().getFullYear() + 2 - i);

/**
 * Month and year, stored structured.
 *
 * Free text would let people type "summer 2021", which no parser can turn into
 * a date range, and employment duration is one of the main things an ATS
 * tries to compute. See docs/04-ats-rules.md.
 */
export function DateField({
  label,
  value,
  onChange,
  allowPresent,
  help,
}: {
  label: string;
  value: DateValue | "present" | undefined;
  onChange: (v: DateEnd | undefined) => void;
  allowPresent?: boolean;
  help?: string;
}) {
  const isPresent = value === "present";
  const d = isPresent ? undefined : value;

  const setMonth = (m: string) => {
    if (m === "present") return onChange("present");
    if (m === "") return onChange(d ? { year: d.year } : undefined);
    onChange({ year: d?.year ?? new Date().getFullYear(), month: Number(m) });
  };

  const setYear = (y: string) => {
    if (y === "") return onChange(undefined);
    onChange({ year: Number(y), month: d?.month });
  };

  return (
    <Box sx={{ mb: 1.75 }}>
      <Typography sx={{ fontSize: 12, color: tone.text2, mb: 0.75 }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          select
          value={isPresent ? "present" : (d?.month ?? "")}
          onChange={(e) => setMonth(e.target.value)}
          sx={{ flex: 1.4 }}
          slotProps={{ htmlInput: { "aria-label": `${label} month` } }}
        >
          <MenuItem value="">Month</MenuItem>
          {allowPresent ? <MenuItem value="present">Present</MenuItem> : null}
          {MONTHS.map((m, i) => (
            <MenuItem key={m} value={i + 1}>
              {m}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          value={isPresent ? "" : (d?.year ?? "")}
          onChange={(e) => setYear(e.target.value)}
          disabled={isPresent}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { "aria-label": `${label} year` } }}
        >
          <MenuItem value="">Year</MenuItem>
          {YEARS.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {help ? (
        <Typography sx={{ fontSize: 11.5, color: tone.text3, mt: 0.5 }}>
          {help}
        </Typography>
      ) : null}
    </Box>
  );
}

/** Comma-separated list edited as text, stored as an array. */
export function ListField({
  label,
  value,
  onChange,
  help,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  help?: string;
  placeholder?: string;
}) {
  return (
    <Field
      label={label}
      value={value.join(", ")}
      onChange={(v) =>
        onChange(
          v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        )
      }
      help={help}
      placeholder={placeholder}
    />
  );
}
