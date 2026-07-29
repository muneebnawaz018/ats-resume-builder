import { z } from "zod";

/** Millimetre/point/inch value kept structured so it can be reformatted and converted. */
export const zLength = z.object({
  value: z.number(),
  unit: z.enum(["pt", "px", "em", "in", "mm"]),
});
export type Length = z.infer<typeof zLength>;

export const zColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "expected a #rrggbb colour");
export type Color = z.infer<typeof zColor>;

/**
 * Dates are structured, never display strings. Storing "Jan 2021" would make
 * reformatting impossible and would break the date rules in docs/04-ats-rules.md,
 * which need to compare and validate ranges.
 */
export const zDateValue = z.object({
  year: z.number().int().min(1900).max(2200),
  month: z.number().int().min(1).max(12).optional(),
});
export type DateValue = z.infer<typeof zDateValue>;

export const zDateEnd = z.union([zDateValue, z.literal("present")]);
export type DateEnd = z.infer<typeof zDateEnd>;

/**
 * Rich text is deliberately limited to bold, italic and link.
 *
 * This maps 1:1 onto DOCX runs (`<w:r>` with `<w:b/>`, `<w:i/>`) and onto
 * HTML `<strong>`/`<em>`/`<a>`. A richer model would need a translation layer
 * per export target and would let users produce output ATS parsers cannot read.
 */
export const zSpan = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  href: z.string().optional(),
});
export type Span = z.infer<typeof zSpan>;

export const zRichText = z.object({ spans: z.array(zSpan) });
export type RichText = z.infer<typeof zRichText>;

export const richText = (text: string): RichText => ({ spans: [{ text }] });

export const plainText = (rt: RichText): string =>
  rt.spans.map((s) => s.text).join("");
