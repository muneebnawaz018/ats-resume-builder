import type { DateEnd, DateValue } from "@/schema";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type DateFormat = "MMM YYYY" | "MM/YYYY" | "YYYY";

/**
 * "Present" is used rather than "Current" or "Now" because it is the token
 * extractors recognise most reliably. See docs/04-ats-rules.md.
 */
export const PRESENT = "Present";

export function formatDate(
  d: DateValue | undefined,
  format: DateFormat = "MMM YYYY",
): string {
  if (!d) return "";
  if (format === "YYYY" || d.month === undefined) return String(d.year);
  if (format === "MM/YYYY") {
    return `${String(d.month).padStart(2, "0")}/${d.year}`;
  }
  return `${MONTHS_SHORT[d.month - 1]} ${d.year}`;
}

export function formatDateEnd(
  d: DateEnd | undefined,
  format: DateFormat = "MMM YYYY",
): string {
  if (d === "present") return PRESENT;
  return formatDate(d, format);
}

/** En dash, not em dash — em dash extracts inconsistently across parsers. */
export const DATE_SEPARATOR = "–";

export function formatDateRange(
  start: DateValue | undefined,
  end: DateEnd | undefined,
  format: DateFormat = "MMM YYYY",
): string {
  const a = formatDate(start, format);
  const b = formatDateEnd(end, format);
  if (!a && !b) return "";
  if (!a) return b;
  if (!b) return a;
  return `${a} ${DATE_SEPARATOR} ${b}`;
}
