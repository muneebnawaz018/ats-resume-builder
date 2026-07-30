import type { Extraction } from "./types";

/**
 * The fields a recruiter's screen actually shows, recovered from extracted
 * text the way a parser would recover them.
 *
 * This is pattern matching, not understanding, and that is the point: it
 * fails in the same places a real applicant tracking system fails. A name
 * buried in a text box or an email split across two runs goes missing here
 * for exactly the reason it goes missing there.
 */
export type Recovered = {
  key: string;
  value: string | null;
  /** Why it was not found, in words the person can act on. */
  lost?: string;
};

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
/** Loose on purpose, international numbers vary more than any pattern. */
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINK = /\b((?:https?:\/\/|www\.)[^\s,)]+|[\w-]+\.(?:dev|io|com|me)\/[^\s,)]+)/i;

const MONTH =
  "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
/** "March 2021 — Present", "06/2018 - 02/2021", "2018–2021". */
const DATE_RANGE = new RegExp(
  `(?:${MONTH}\\s+\\d{4}|\\d{1,2}[/.]\\d{4}|\\d{4})\\s*(?:[–—−-]|to|until)\\s*(?:${MONTH}\\s+\\d{4}|\\d{1,2}[/.]\\d{4}|\\d{4}|present|current|now)`,
  "gi",
);

const SECTION_WORDS =
  /^(experience|work experience|employment|professional experience|education|skills|technical skills|projects|summary|profile|about|certifications|publications|awards|languages|interests|volunteering)\b/i;

/**
 * A line that reads like a person's name: near the top, short, mostly
 * letters, and not carrying an email or a digit.
 */
function looksLikeName(text: string): boolean {
  const t = text.trim();
  if (t.length < 3 || t.length > 60) return false;
  if (EMAIL.test(t) || /\d/.test(t)) return false;
  if (SECTION_WORDS.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 5) return false;
  return words.every((w) => /^[\p{L}'.-]+$/u.test(w));
}

export function recoverFields(extraction: Extraction): Recovered[] {
  const { text, blocks } = extraction;

  const email = EMAIL.exec(text)?.[0] ?? null;

  /*
   * The phone pattern matches date ranges and postcodes too, so candidates
   * are filtered by digit count: a phone number has between seven and fifteen
   * digits, which is the range the E.164 standard allows.
   */
  let phone: string | null = null;
  for (const line of text.split("\n")) {
    const hit = PHONE.exec(line)?.[1];
    if (!hit) continue;
    const digits = hit.replace(/\D/g, "").length;
    if (digits >= 7 && digits <= 15) {
      phone = hit.trim();
      break;
    }
  }

  // Only the first eight blocks: a name found halfway down the page is a
  // reference or a colleague, not the candidate.
  const name =
    blocks.slice(0, 8).find((b) => looksLikeName(b.text))?.text.trim() ?? null;

  const link = LINK.exec(text)?.[1] ?? null;

  const sections = blocks
    .filter((b) => b.kind === "heading" && SECTION_WORDS.test(b.text))
    .map((b) => b.text.trim());

  const ranges = text.match(DATE_RANGE) ?? [];

  return [
    {
      key: "name",
      value: name,
      lost: "no line at the top reads as a name",
    },
    {
      key: "email",
      value: email,
      lost: "no address found in the text",
    },
    {
      key: "phone",
      value: phone,
      lost: "no number found in the text",
    },
    {
      key: "links",
      value: link,
      lost: "no portfolio or profile URL",
    },
    {
      key: "sections",
      value: sections.length ? sections.join(", ") : null,
      lost: "no headings a parser recognises",
    },
    {
      key: "dates",
      value: ranges.length
        ? `${ranges.length} range${ranges.length === 1 ? "" : "s"}, first is ${ranges[0]}`
        : null,
      lost: "no start and end dates found",
    },
  ];
}
