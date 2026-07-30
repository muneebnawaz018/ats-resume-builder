/**
 * Unfilled template text: `Company 1`, `[Job Title]`, `John Doe`.
 *
 * Greenhouse skips data it reads as fake, so these parse to nothing. In
 * practice the finding is worth more than the parse risk it describes: it
 * usually means somebody downloaded a template, filled in half of it, and
 * uploaded the rest. That is the most useful thing we could tell them, and
 * today we say nothing.
 */

/**
 * Patterns anchored end to end, so a real name has to match the whole line.
 *
 * Real companies contain digits (`3M`, `7-Eleven`, `Studio 54`), which is why
 * the numbered patterns require a generic prefix word and anchor the digits at
 * the end rather than looking for a digit anywhere.
 */
const PLACEHOLDER: readonly RegExp[] = [
  /^(?:company|client|employer|organization|organisation)\s*\d+$/i,
  /^employee\s*\d+$/i,
  /^(?:first|firstname)\s+(?:last|lastname)$/i,
  /^any\s*(?:company|corp|inc)\b/i,
  /^(?:your|full)\s+name$/i,
  // [Company Name], [Job Title], {{name}}
  /^\[.+\]$/,
  /^\{\{.+\}\}$/,
  /lorem\s+ipsum/i,
  /^x{3,}$/i,
  /^(?:john|jane)\s+doe$/i,
];

/**
 * Reserved for fiction, so ambiguous by design.
 *
 * 555 numbers and example.com addresses are both real placeholder markers and
 * what a careful person writes on purpose when they do not want a live contact
 * in a document. RFC 2606 reserves example.com for exactly that. We cannot
 * tell "unfilled template" from "deliberately redacted" here, so these are
 * mentioned and never scored, the same call the 555 number gets.
 */
const ADVISORY: readonly { pattern: RegExp; note: string }[] = [
  {
    pattern: /\b555[-.\s]?555[-.\s]?\d{4}\b|\b\(?555\)?[-.\s]?01\d{2}\b/,
    note: "a 555 phone number",
  },
  {
    pattern: /@(?:example|test)\.(?:com|org)\b/i,
    note: "an example.com address",
  },
];

/** Lines short enough to be a name, title or employer rather than prose. */
const MAX_LINE = 60;

export type PlaceholderReport = {
  /** The offending text, as written, deduplicated. */
  hits: string[];
  /** Reserved-for-fiction contact details. Mentioned in copy, never scored. */
  advisory: string[];
};

/**
 * Scans recovered field values and short standalone lines.
 *
 * Short lines only: a sentence mentioning "lorem ipsum" inside a paragraph is
 * a different problem from a heading that is still `[Job Title]`, and matching
 * prose would fire on anyone who writes about templates for a living.
 */
export function findPlaceholders(
  text: string,
  values: readonly (string | null)[] = [],
): PlaceholderReport {
  const candidates = [
    ...values.filter((v): v is string => v !== null),
    ...text.split("\n").map((l) => l.trim()).filter((l) => l && l.length <= MAX_LINE),
  ];

  const hits: string[] = [];
  for (const line of candidates) {
    if (!PLACEHOLDER.some((p) => p.test(line))) continue;
    if (!hits.includes(line)) hits.push(line);
  }

  return {
    hits,
    advisory: ADVISORY.filter((a) => a.pattern.test(text)).map((a) => a.note),
  };
}
