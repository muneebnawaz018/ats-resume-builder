import { newId } from "@/lib";
import {
  DEFAULT_THEME_ID,
  RESUME_SCHEMA_VERSION,
  richText,
  type DateEnd,
  type DateValue,
  type Resume,
  type Section,
  type SectionType,
} from "@/schema";
import type { Block, Extraction } from "./types";

/**
 * Turns an extraction into a document the editor can open.
 *
 * This is structured guessing, and it is allowed to guess wrong. Everything
 * lands in the editor where it can be corrected in a few seconds, which is a
 * far better outcome than a blank page and a request to retype eight years of
 * work history. What it must never do is silently drop text: anything it
 * cannot place goes into a plain section rather than the bin.
 */

/** Section headings people actually write, mapped to what the editor calls them. */
const SECTION_ALIASES: [RegExp, SectionType, string][] = [
  [/^(work\s+)?experience$|^employment|^professional experience|^career/i, "experience", "Experience"],
  [/^education|^academic/i, "education", "Education"],
  [/^(technical\s+|core\s+)?skills|^competenc|^technolog/i, "skills", "Skills"],
  [/^projects?$|^selected work/i, "projects", "Projects"],
  [/^certificat|^licen[cs]/i, "certifications", "Certifications"],
  [/^publication|^papers|^talks/i, "publications", "Publications"],
  [/^awards?|^honou?rs/i, "awards", "Awards"],
  [/^languages?$/i, "languages", "Languages"],
  [/^volunteer|^community/i, "volunteer", "Volunteering"],
  [/^summary|^profile|^objective|^about/i, "text", "Summary"],
];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
const URL_LIKE =
  /\b((?:https?:\/\/|www\.)[^\s,;)]+|(?:linkedin\.com|github\.com|gitlab\.com)\/[^\s,;)]+|[\w-]+\.(?:dev|io|me|xyz|design)\b[^\s,;)]*)/i;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;

const MONTH_NAME = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const ONE_DATE = `(?:${MONTH_NAME}\\s+(\\d{4})|(\\d{1,2})[/.](\\d{4})|(\\d{4}))`;
const RANGE = new RegExp(
  `${ONE_DATE}\\s*(?:[–—−-]|to|until)\\s*(?:(present|current|now|ongoing)|${ONE_DATE})`,
  "i",
);

/** "March 2021" / "03/2021" / "2021" from a matched group triple. */
function toDate(
  month: string | undefined,
  year: string | undefined,
  numericMonth?: string,
  numericYear?: string,
  bareYear?: string,
): DateValue | undefined {
  if (year) {
    const m = month ? MONTHS[month.slice(0, 3).toLowerCase()] : undefined;
    return { year: Number(year), ...(m ? { month: m } : {}) };
  }
  if (numericYear) {
    return { year: Number(numericYear), month: Number(numericMonth) };
  }
  if (bareYear) return { year: Number(bareYear) };
  return undefined;
}

type ParsedRange = { start?: DateValue; end?: DateEnd };

/** Pulls a date range out of a line, if there is one. */
function parseRange(line: string): ParsedRange | null {
  const m = RANGE.exec(line);
  if (!m) return null;
  const start = toDate(m[1], m[2], m[3], m[4], m[5]);
  const end: DateEnd | undefined = m[6]
    ? "present"
    : toDate(m[7], m[8], m[9], m[10], m[11]);
  if (!start && !end) return null;
  return { start, end };
}

/** Everything on a line that is not the date range. */
function withoutRange(line: string): string {
  return line.replace(RANGE, "").replace(/[|·—–,\s]+$/, "").replace(/^[|·—–,\s]+/, "").trim();
}

function matchSection(text: string): [SectionType, string] | null {
  const t = text.trim().replace(/[:.]$/, "");
  if (t.length > 40) return null;
  for (const [re, type, title] of SECTION_ALIASES) {
    if (re.test(t)) return [type, title];
  }
  return null;
}

/**
 * Splits "Senior Engineer, Northwind Systems" or "Northwind — Senior Engineer"
 * into a role and an organisation.
 *
 * Which half is which is genuinely ambiguous, so the common ordering wins:
 * people write their title first. Getting it backwards costs one drag in the
 * editor; refusing to split at all costs retyping both.
 */
function splitRole(line: string): { role: string; organization: string } {
  const parts = line.split(/\s+[–—|]\s+|,\s+|\s+at\s+/i).map((s) => s.trim());
  if (parts.length >= 2) return { role: parts[0], organization: parts.slice(1).join(", ") };
  return { role: line.trim(), organization: "" };
}

type Group = { type: SectionType; title: string; lines: Block[] };

/**
 * Groups blocks under the headings that precede them.
 *
 * Blocks before the first recognised heading are the header of the document:
 * name, contact details, and sometimes a summary paragraph.
 */
function group(blocks: Block[]): { head: Block[]; groups: Group[] } {
  const head: Block[] = [];
  const groups: Group[] = [];
  let current: Group | null = null;

  for (const block of blocks) {
    // A heading is trusted when the format supplied one; when it did not, the
    // wording alone has to carry it, which is why the alias list is strict.
    const asSection =
      block.kind === "heading" || block.kind === "paragraph"
        ? matchSection(block.text)
        : null;

    if (asSection && (block.kind === "heading" || block.text.length < 32)) {
      current = { type: asSection[0], title: asSection[1], lines: [] };
      groups.push(current);
      continue;
    }
    if (current) current.lines.push(block);
    else head.push(block);
  }

  return { head, groups };
}

/** Experience and projects: a role line, a date line, then bullets. */
function buildEntries(lines: Block[], type: "experience" | "projects") {
  const items: Section["items"] = [];
  let open: {
    id: string;
    visible: true;
    role: string;
    organization: string;
    start?: DateValue;
    end?: DateEnd;
    bullets: ReturnType<typeof richText>[];
    tech: string[];
  } | null = null;

  const push = () => {
    if (!open) return;
    items.push(
      type === "projects"
        ? {
            id: open.id,
            visible: true,
            name: [open.role, open.organization].filter(Boolean).join(", "),
            bullets: open.bullets.length ? open.bullets : [richText("")],
            start: open.start,
            end: open.end,
            tech: [],
          }
        : {
            id: open.id,
            visible: true,
            role: open.role,
            organization: open.organization,
            start: open.start,
            end: open.end,
            bullets: open.bullets.length ? open.bullets : [richText("")],
            tech: [],
          },
    );
    open = null;
  };

  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;

    const range = parseRange(text);
    const rest = range ? withoutRange(text) : text;

    if (line.kind === "listItem") {
      if (!open) open = blank();
      open.bullets.push(richText(text));
      continue;
    }

    if (range) {
      // A date on its own line belongs to the entry above it; a date with text
      // beside it starts a new one.
      if (open && !rest && !open.start) {
        open.start = range.start;
        open.end = range.end;
        continue;
      }
      push();
      open = blank();
      open.start = range.start;
      open.end = range.end;
      if (rest) Object.assign(open, splitRole(rest));
      continue;
    }

    // A short line with no date reads as the next job title.
    if (!open || (open.bullets.length === 0 && !open.role)) {
      if (!open) open = blank();
      if (!open.role) {
        Object.assign(open, splitRole(text));
        continue;
      }
    }
    if (text.length < 80 && !open.organization && !/[.]$/.test(text)) {
      open.organization = text;
      continue;
    }
    open.bullets.push(richText(text));
  }
  push();

  return items;

  function blank() {
    return {
      id: newId("i"),
      visible: true as const,
      role: "",
      organization: "",
      bullets: [] as ReturnType<typeof richText>[],
      tech: [] as string[],
    };
  }
}

function buildEducation(lines: Block[]): Section["items"] {
  return lines
    .filter((l) => l.text.trim())
    .map((l) => {
      const range = parseRange(l.text);
      const rest = range ? withoutRange(l.text) : l.text;
      const [degree, ...institution] = rest.split(/,\s+/);
      return {
        id: newId("i"),
        visible: true,
        degree: degree.trim(),
        institution: institution.join(", ").trim(),
        start: range?.start,
        end: range?.end === "present" ? undefined : range?.end,
        detail: [],
      };
    });
}

/** Skills arrive as one comma-separated line far more often than as groups. */
function buildSkills(lines: Block[]): Section["items"] {
  return lines
    .filter((l) => l.text.trim())
    .map((l) => {
      const [maybeLabel, ...rest] = l.text.split(/:\s*/);
      const hasLabel = rest.length > 0 && maybeLabel.length < 30;
      const list = (hasLabel ? rest.join(": ") : l.text)
        .split(/[,;•·|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id: newId("i"),
        visible: true,
        label: hasLabel ? maybeLabel.trim() : "",
        items: list,
      };
    });
}

function buildSimple(lines: Block[]): Section["items"] {
  return lines
    .filter((l) => l.text.trim())
    .map((l) => ({
      id: newId("i"),
      visible: true,
      title: l.text.trim(),
    }));
}

function buildText(lines: Block[]): Section["items"] {
  const body = lines.map((l) => l.text.trim()).filter(Boolean).join("\n");
  return body ? [{ id: newId("i"), visible: true, body: richText(body) }] : [];
}

export function toResume(
  extraction: Extraction,
  sourceName: string,
  now: string = new Date().toISOString(),
): Resume {
  const { head, groups } = group(extraction.blocks);

  /* ---- basics, from the block of text above the first heading ---- */

  const headText = head.map((b) => b.text).join("\n");
  const email = EMAIL.exec(headText)?.[0] ?? EMAIL.exec(extraction.text)?.[0];
  const url = URL_LIKE.exec(headText)?.[1];

  let phone: string | undefined;
  for (const line of headText.split("\n")) {
    const hit = PHONE.exec(line)?.[1];
    const digits = hit?.replace(/\D/g, "").length ?? 0;
    if (hit && digits >= 7 && digits <= 15) {
      phone = hit.trim();
      break;
    }
  }

  // The name is the first line that carries no contact details, on almost
  // every resume ever written, that is the line at the very top.
  const nameBlock = head.find(
    (b) =>
      b.text.length < 60 &&
      !EMAIL.test(b.text) &&
      !/\d/.test(b.text) &&
      /^[\p{L}][\p{L}\s'.-]+$/u.test(b.text.trim()),
  );
  const fullName = nameBlock?.text.trim() ?? "";

  // The line after the name, when it is short and not contact details, is
  // nearly always the headline.
  const nameAt = nameBlock ? head.indexOf(nameBlock) : -1;
  const after = nameAt >= 0 ? head[nameAt + 1] : undefined;
  const headline =
    after &&
    after.text.length < 70 &&
    !EMAIL.test(after.text) &&
    !PHONE.test(after.text)
      ? after.text.trim()
      : undefined;

  const usedInHead = new Set(
    [nameBlock?.text, after && headline ? after.text : null].filter(Boolean),
  );
  const leftover = head
    .map((b) => b.text.trim())
    .filter(
      (t) =>
        t &&
        !usedInHead.has(t) &&
        !EMAIL.test(t) &&
        !URL_LIKE.test(t) &&
        !(phone && t.includes(phone)),
    );

  /* ---- sections ---- */

  const sections: Section[] = [];
  for (const g of groups) {
    const items =
      g.type === "experience" || g.type === "projects"
        ? buildEntries(g.lines, g.type)
        : g.type === "education"
          ? buildEducation(g.lines)
          : g.type === "skills"
            ? buildSkills(g.lines)
            : g.type === "text"
              ? buildText(g.lines)
              : buildSimple(g.lines);

    if (items.length) {
      sections.push({
        id: newId("s"),
        type: g.type,
        title: g.title,
        visible: true,
        items,
      });
    }
  }

  /*
   * Anything above the first heading that was not contact details, usually a
   * summary paragraph. It goes in as a section rather than being discarded,
   * which is the rule this whole function follows: nothing is thrown away.
   */
  const summary = leftover.length ? leftover.join("\n") : undefined;

  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    id: newId("r"),
    name: sourceName.replace(/\.[^.]+$/, "") || "Imported resume",
    createdAt: now,
    updatedAt: now,
    themeId: DEFAULT_THEME_ID,
    basics: {
      fullName,
      headline,
      email,
      phone,
      links: url
        ? [{ id: newId("l"), label: "Website", url, displayAs: "url" }]
        : [],
      summary: summary ? richText(summary) : undefined,
    },
    sections,
    meta: { jurisdiction: "generic" },
  };
}
