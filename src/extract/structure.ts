import type { Block, Extraction } from "./types";

/**
 * What the document is made of, rather than what it contains.
 *
 * `fields.ts` asks whether a value exists anywhere in the text: is there an
 * email, is there a date range, is there a heading a parser recognises. That is
 * the right question for contact details and the wrong one for structure. A
 * resume with five jobs, four of them undated, answers "yes, there are dates"
 * and passes.
 *
 * This module asks the relational questions instead. Which sections exist,
 * which entries sit under them, and does each entry carry the three things a
 * parser needs to build a work-history row: what you did, who for, and when.
 *
 * None of it is understanding. It is the same shallow pattern matching a real
 * extractor does, which is the point: it fails where they fail.
 */

/* ------------------------------------------------------------------ *
 * Section names
 * ------------------------------------------------------------------ */

/**
 * The section names parsers are built to recognise, grouped by what they mean.
 *
 * Grouped rather than listed flat, because the useful question is not "is this
 * a known heading" but "does this document have a work history at all". A
 * resume can be missing Education legitimately; one with no experience section
 * has nothing for a parser to build a career from.
 */
export const SECTION_ALIASES: Record<string, readonly string[]> = {
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
    "work history",
    "career history",
    "relevant experience",
  ],
  education: ["education", "academic background", "qualifications"],
  skills: ["skills", "technical skills", "core skills", "competencies"],
  summary: ["summary", "profile", "about", "objective", "professional summary"],
  projects: ["projects", "personal projects", "selected projects"],
  certifications: ["certifications", "certificates", "licenses"],
  other: [
    "publications",
    "awards",
    "honors",
    "honours",
    "languages",
    "interests",
    "volunteering",
    "references",
    "activities",
  ],
};

/** The sections whose absence is worth reporting. */
export const CORE_SECTIONS = ["experience", "education", "skills"] as const;

/**
 * A line that reads like somebody's name: short, all letters, no digits.
 *
 * Only used to keep the candidate's own name out of the unmapped-heading list.
 * Same shape as the check in fields.ts, kept local because this one is allowed
 * to be wrong in a way that one is not: a false positive here loses a finding,
 * a false positive there loses the name.
 */
function looksLikePersonName(text: string): boolean {
  const t = text.trim();
  if (t.length < 3 || t.length > 60) return false;
  if (/\d|@/.test(t)) return false;
  const words = t.split(/\s+/);
  return words.length <= 4 && words.every((w) => /^[\p{L}'.-]+$/u.test(w));
}

/** Trailing colons, leading bullets, and the ALL CAPS most headings are set in. */
function normalise(text: string): string {
  return text
    .trim()
    .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "")
    .toLowerCase();
}

/** Which canonical section a heading names, or null if it names none. */
export function classifyHeading(text: string): string | null {
  const t = normalise(text);
  if (!t || t.length > 60) return null;
  for (const [group, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.includes(t)) return group;
  }
  /*
   * "Work Experience & Projects", "Education / Training". A heading that
   * contains a known name is treated as that section: parsers match on
   * substrings too, and being stricter here than they are would invent
   * failures that do not happen.
   */
  for (const [group, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.some((a) => a.length > 5 && t.includes(a))) return group;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const ENDPOINT = `(?:${MONTH}\\s+\\d{4}|\\d{1,2}[/.]\\d{4}|\\d{4})`;
const ONGOING = "(?:present|current|now|to date|ongoing|till date)";

/** A start and an end, the shape a parser needs to compute time in role. */
export const DATE_RANGE = new RegExp(
  `${ENDPOINT}\\s*(?:[–—−-]|to|until)\\s*(?:${ENDPOINT}|${ONGOING})`,
  "gi",
);

/**
 * How a date endpoint is written.
 *
 * The distinction that matters is not pretty formatting, it is whether two
 * endpoints in the same document are written in shapes a parser has to handle
 * differently. "March 2021" and "03/2021" are both fine alone and a problem
 * together, because duration is computed by pairing them.
 */
export type DateStyle = "monthYear" | "numeric" | "yearOnly";

/*
 * Compiled once. These are called per line of a document, and a regex built
 * from a template string inside the function is recompiled on every call.
 *
 * `DATE_RANGE_SCAN` is a separate object rather than `DATE_RANGE` itself: both
 * carry the `g` flag, which makes `lastIndex` stateful, and sharing one
 * instance between a `test` here and a `match` elsewhere makes each call
 * depend on where the previous one stopped.
 */
const MONTH_YEAR = new RegExp(`^${MONTH}\\s+\\d{4}$`);
const DATE_RANGE_SCAN = new RegExp(DATE_RANGE.source, "gi");
/** Ungreedy about state: no `g`, so `test` never carries a `lastIndex`. */
const DATE_RANGE_TEST = new RegExp(DATE_RANGE.source, "i");

export function dateStyle(endpoint: string): DateStyle | null {
  const t = endpoint.trim().toLowerCase();
  if (MONTH_YEAR.test(t)) return "monthYear";
  if (/^\d{1,2}[/.]\d{4}$/.test(t)) return "numeric";
  if (/^\d{4}$/.test(t)) return "yearOnly";
  return null;
}

export const DATE_STYLE_LABEL: Record<DateStyle, string> = {
  monthYear: "March 2021",
  numeric: "03/2021",
  yearOnly: "2021",
};

/**
 * Words used for a job that has not ended.
 *
 * "Present" is the one every vendor's own documentation and template uses.
 * The others are read by some parsers and not others, and a range whose end
 * is not recognised is a range with no end: the role either disappears from
 * the timeline or is recorded as still open in a way that skews duration.
 */
const ONGOING_PREFERRED = /\bpresent\b/i;
const ONGOING_OTHER = /\b(current|currently|now|to date|ongoing|till date)\b/i;
/** An en dash or hyphen with nothing after it: "Mar 2021 –". */
const OPEN_ENDED = new RegExp(`${ENDPOINT}\\s*[–—−-]\\s*(?:$|\\n)`, "im");

/* ------------------------------------------------------------------ *
 * Entries
 * ------------------------------------------------------------------ */

/**
 * One position, degree or project: the heading-ish line that starts it and
 * everything under it up to the next one.
 */
export type Entry = {
  /** The line that opened it, usually the job title. */
  title: string;
  /** Which section it sits in, canonical name or null. */
  section: string | null;
  /** Every line in it, the title included. */
  lines: string[];
  hasDates: boolean;
  /** A line that reads like an employer or an institution. */
  hasOrg: boolean;
  /**
   * Whether any line in it was a bullet.
   *
   * Tracked as a flag rather than re-tested from the text, because an
   * extractor that recognises a list strips the glyph: `listItem` blocks
   * arrive as plain sentences, and looking for a leading bullet character
   * found nothing in exactly the formats that understood the list best.
   */
  hasBullets: boolean;
  /**
   * Whether this really is a position rather than a renamed section heading.
   *
   * Both look identical to an extractor: a heading-level line with content
   * under it. The tell is what the content is. A position carries dates, or an
   * employer on its title line, or bullets. A section heading called "What
   * I'm Good At" carries a list of skills and none of the three, and treating
   * it as a position is what made it impossible to report as a renamed
   * section: it was excluded from the heading check for being an entry.
   */
  isTitle: boolean;
};

/**
 * A line that could be an employer, a school or a client.
 *
 * Deliberately loose. An organisation name has no reliable shape, so this
 * looks for what one is not: not a sentence, not a bullet, not a date on its
 * own, not a contact detail. Anything short and prose-free that sits near the
 * top of an entry is treated as one, which is roughly what a parser does.
 */
function looksLikeOrg(text: string): boolean {
  const t = text.trim();
  if (t.length < 2 || t.length > 90) return false;
  if (/^[•·▪–—-]/.test(t)) return false;
  if (/@|https?:\/\//.test(t)) return false;
  if (t.split(/\s+/).length > 12) return false;
  // A line that is only a date range is the date row, not the employer.
  const withoutDates = t.replace(DATE_RANGE_SCAN, "").trim();
  return withoutDates.replace(/[\p{P}\s]/gu, "").length > 1;
}

/**
 * "Senior Engineer, Northwind" and "Senior Engineer | Northwind": a title line
 * carrying the employer after a separator. Both halves have to be substantial,
 * or "Engineer, Jr." would count.
 */
function titleCarriesOrg(title: string): boolean {
  const parts = title.split(/\s+[|·–—]\s+|,\s+|\s+\bat\b\s+/i);
  if (parts.length < 2) return false;
  return parts.slice(1).some((p) => p.trim().replace(/[\p{P}\s]/gu, "").length >= 3);
}

/**
 * A line that is a date range and not much else.
 *
 * "March 2021 - Present" is a date row. "Shipped v2 between 2019 and 2021" is a
 * sentence that happens to contain one, and opening an entry on it would cut a
 * job in half.
 */
function isDateRow(text: string): boolean {
  const t = text.trim();
  const ranges = t.match(DATE_RANGE_SCAN);
  if (!ranges) return false;
  const remainder = ranges
    .reduce((acc, r) => acc.replace(r, ""), t)
    .replace(/[\p{P}\s]/gu, "");
  return remainder.length <= 12;
}

/** A bullet, by glyph or by list-item kind. */
function isBullet(block: Block): boolean {
  return block.kind === "listItem" || /^[•·▪◦‣*·]/.test(block.text.trim());
}

/**
 * Splits a document into sections and their entries.
 *
 * Entries are found by looking for the heading-level blocks *inside* a section,
 * which is how a resume is actually built: a section heading, then one
 * heading-ish line per position. Where the format carries no heading marks at
 * all, a line followed by a date range opens an entry instead. Both are
 * approximations, and both are the approximations a parser makes.
 */
export function segmentEntries(extraction: Extraction): Entry[] {
  const entries: Entry[] = [];
  let section: string | null = null;
  let sectionHeadingSeen = false;
  let current: Entry | null = null;
  /**
   * The last two ordinary lines, held in case the next one turns out to be a
   * date row.
   *
   * Two, not one. The commonest undecorated entry is three lines: title,
   * employer, dates. Holding only the previous line made the employer the
   * title and lost the title entirely, so every such entry was reported as
   * having no employer.
   */
  let previous: string[] = [];

  const close = () => {
    if (!current) return;
    const body = current.lines.join("\n");
    current.hasDates = DATE_RANGE_TEST.test(body);
    /*
     * The employer is as often on the title line as under it:
     * "Senior Backend Engineer, Northwind Systems" is the commonest shape a
     * resume uses, and looking only at the lines below it reported every one
     * of those entries as having no employer.
     */
    current.hasOrg =
      titleCarriesOrg(current.title) ||
      current.lines.slice(1).some((l) => !isBulletText(l) && looksLikeOrg(l));
    current.isTitle =
      current.hasDates ||
      titleCarriesOrg(current.title) ||
      current.hasBullets ||
      current.lines.length > 3;
    entries.push(current);
    current = null;
  };

  for (const block of extraction.blocks) {
    const text = block.text.trim();
    if (!text) continue;

    const asSection = block.kind === "heading" ? classifyHeading(text) : null;

    /*
     * A recognised section name closes whatever entry was open and starts a
     * new context. An unrecognised heading inside a section is an entry title.
     */
    if (block.kind === "heading" && (asSection || !sectionHeadingSeen)) {
      if (asSection) {
        close();
        section = asSection;
        sectionHeadingSeen = true;
        previous = [];
        continue;
      }
    }

    if (block.kind === "heading" && sectionHeadingSeen) {
      close();
      previous = [];
      current = {
        title: text,
        section,
        lines: [text],
        hasDates: false,
        hasOrg: false,
        hasBullets: false,
        isTitle: true,
      };
      continue;
    }

    if (current) {
      /*
       * A plain line after the entry's bullets have started is the next
       * position, not more of this one. Without this, a format that carries no
       * heading marks merged every job into the first entry and the undated
       * ones disappeared, which is the case these checks exist for.
       */
      if (!isBullet(block) && !isDateRow(text) && current.hasBullets) {
        close();
        previous = [text];
        continue;
      }
      current.lines.push(text);
      if (isBullet(block)) current.hasBullets = true;
      previous = [];
      continue;
    }

    /*
     * No heading marks in this format.
     *
     * Plain text and unstyled Word carry no way to say "this line is a job
     * title", so the date row is the anchor: a line that is mostly a date
     * range opens an entry whose title is the line above it. Titling the entry
     * with the date row itself, which is what reading forwards does, produces
     * entries called "March 2021 - Present" and an employer check that can
     * never pass.
     */
    if (section && !isBullet(block) && isDateRow(text)) {
      const head = previous.length ? previous : [text];
      current = {
        title: head[0],
        section,
        lines: previous.length ? [...previous, text] : [text],
        hasDates: false,
        hasOrg: false,
        hasBullets: false,
        isTitle: true,
      };
      previous = [];
      continue;
    }

    /*
     * A bullet with no entry open. The line above it was the position: an
     * undated job is invisible to the date-row anchor above, and an undated
     * job is exactly what the entry checks exist to find.
     */
    if (section && isBullet(block) && previous.length) {
      current = {
        title: previous[0],
        section,
        lines: [...previous, text],
        hasDates: false,
        hasOrg: false,
        hasBullets: true,
        isTitle: true,
      };
      previous = [];
      continue;
    }

    // Keep at most two: a third would start reaching into the entry above.
    if (section && !isBullet(block)) previous = [...previous, text].slice(-2);
  }

  close();
  return entries;
}

function isBulletText(text: string): boolean {
  return /^[•·▪◦‣*·]/.test(text.trim());
}

/* ------------------------------------------------------------------ *
 * The report
 * ------------------------------------------------------------------ */

export type StructureReport = {
  /** Canonical sections the document has. */
  sections: string[];
  /** Core sections it does not: experience, education, skills. */
  missingCore: string[];
  /**
   * Headings that read as headings and name no section a parser knows.
   * Greenhouse lists inconsistent section formatting as a parse failure, and a
   * renamed heading takes everything under it out of the record.
   */
  unmapped: string[];
  entries: Entry[];
  /** Entries under experience or education with no date range in them. */
  undatedEntries: Entry[];
  /** Entries with no line that reads as an employer or an institution. */
  orphanEntries: Entry[];
  /** Distinct date shapes used in the document. Two or more is the finding. */
  dateStyles: DateStyle[];
  /** An ongoing role written as anything other than "Present". */
  ongoingWording: string | null;
  /** A range with a start, a dash and nothing after it. */
  openEnded: boolean;
};

/** Sections whose entries are expected to be dated. */
const DATED_SECTIONS = new Set(["experience", "education", "projects"]);

export function analyseStructure(extraction: Extraction): StructureReport {
  const headings = extraction.blocks.filter((b) => b.kind === "heading");

  const sections: string[] = [];
  const unmapped: string[] = [];
  for (const h of headings) {
    const group = classifyHeading(h.text);
    if (group) {
      if (!sections.includes(group)) sections.push(group);
    }
  }

  /*
   * Only headings that sit where a section heading sits count as unmapped.
   *
   * Every job title in the document is also a heading block, and reporting
   * "Senior Backend Engineer" as an unrecognised section name would bury the
   * one heading that genuinely is one. A section heading is short, and it is
   * not followed by a date range on its own line.
   */
  const entries = segmentEntries(extraction);
  const entryTitles = new Set(
    entries.filter((e) => e.isTitle).map((e) => e.title),
  );

  /*
   * The name is heading-styled in most exports and sits above every section,
   * so it is exempt. Only the name: an earlier version skipped everything
   * above the first *recognised* heading, which meant a document whose work
   * history was the renamed one had its only unmapped heading hidden, exactly
   * when naming it mattered most.
   */
  extraction.blocks.forEach((h, i) => {
    if (h.kind !== "heading") return;
    const text = h.text.trim();
    if (i < 3 && looksLikePersonName(text)) return;
    if (classifyHeading(text)) return;
    if (entryTitles.has(text)) return;
    if (text.split(/\s+/).length > 6) return;
    if (DATE_RANGE_TEST.test(text)) return;
    if (!unmapped.includes(text)) unmapped.push(text);
  });

  const missingCore = CORE_SECTIONS.filter((s) => !sections.includes(s));

  const dated = entries.filter(
    (e) => e.isTitle && e.section !== null && DATED_SECTIONS.has(e.section),
  );
  const undatedEntries = dated.filter((e) => !e.hasDates);
  const orphanEntries = dated.filter((e) => e.hasDates && !e.hasOrg);

  /*
   * Date shapes, taken from the endpoints rather than the ranges. A range
   * written "March 2021 - 2023" is itself inconsistent, and reading whole
   * ranges would miss that.
   */
  const styles = new Set<DateStyle>();
  for (const range of extraction.text.match(DATE_RANGE) ?? []) {
    for (const part of range.split(/\s*(?:[–—−-]|to|until)\s*/i)) {
      const style = dateStyle(part);
      if (style) styles.add(style);
    }
  }

  const ongoingMatch = ONGOING_OTHER.exec(extraction.text);
  const usesPreferred = ONGOING_PREFERRED.test(extraction.text);

  return {
    sections,
    missingCore,
    unmapped,
    entries,
    undatedEntries,
    orphanEntries,
    dateStyles: [...styles],
    // Only a finding when it stands in for "Present", not when the word appears
    // in a sentence next to a range that already says Present properly.
    ongoingWording:
      ongoingMatch && !usesPreferred ? ongoingMatch[0].toLowerCase() : null,
    openEnded: OPEN_ENDED.test(extraction.text),
  };
}
