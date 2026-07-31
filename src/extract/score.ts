import { ATS_ACCEPTED } from "@/lib/formats";
import type { Recovered } from "./fields";
import { detectLetterSpacing, SPACING_TIERS } from "./letterspacing";
import { findPlaceholders } from "./placeholder";
import type { Extraction } from "./types";

/**
 * A score, every reason it is not 100, and where each reason comes from.
 *
 * The first version of this file invented its own weights, which made the
 * number worthless: a score nobody can trace is just an opinion with a
 * typeface. Every deduction here now carries a citation, and the ones that
 * matter most come from vendor documentation rather than from advice blogs.
 *
 * Two sources do most of the work:
 *
 *   Greenhouse publishes the actual list of things that break its parser, and
 *   it is unusually specific: graphics, tables, headers and footers, contact
 *   details in a text box, multi-column layouts, inconsistent section
 *   formatting. It also publishes two hard limits, 2.5MB and "an image will
 *   not parse".
 *
 *   A 2025 layout-aware parsing paper measures which fields survive. Dates and
 *   named entities come out at F1 0.95 to 0.97; long descriptions collapse to
 *   0.55 without layout handling. About 20% of real resumes use a non-linear
 *   multi-column layout, and removing layout handling costs 10+ accuracy
 *   points on those.
 *
 * That evidence changed the weights. Structural faults a vendor names in its
 * own documentation are heavy. Missing dates are lighter than they were, since
 * parsers read dates reliably when they exist, so an absence is a gap in the
 * document rather than a parsing risk. Nothing is weighted by how easy it was
 * to detect.
 *
 * What this is not: a Workday score, or a Taleo score. Nobody outside those
 * companies has their thresholds, and every product that claims otherwise is
 * guessing. This measures what an extractor can get out of a file, which is
 * the input all of them start from.
 */
export type Basis = {
  /** The specific finding this weight rests on. */
  claim: string;
  source: string;
  url: string;
};

/**
 * How bad a finding is, for display.
 *
 * The UI shows this instead of the point value. The weights are the one part of
 * this that is ours rather than borrowed, and a list of exact costs is a recipe
 * for gaming the number instead of fixing the document. The severity still
 * ranks the list honestly, which is all a reader needs to know what to do first.
 */
export type Severity = "blocking" | "high" | "medium" | "low";

export type Deduction = {
  label: string;
  /**
   * Percent of the remaining score this finding takes, 0 to 100, applied
   * multiplicatively rather than subtracted. Internal: never rendered, and the
   * reason `severity` exists.
   *
   * The unit changed when the aggregate did. Under the old `98 - sum(costs)` a
   * cost of 18 always removed 18 points; now it removes 18% of whatever is
   * left, so a finding costs more on a clean document than on a wrecked one.
   * The ordering is unchanged, so the severity labels still rank correctly.
   */
  cost: number;
  severity: Severity;
  detail: string;
  basis: Basis;
  /**
   * Which detectors produced this, when more than one can. Set for findings
   * that merge several signals describing a single defect.
   */
  triggeredBy?: string[];
};

/**
 * Something that stops the file being accepted at all, held outside the score.
 *
 * Not gradual, so multiplying it into a number would be dishonest in both
 * directions: it is neither a 20% haircut nor a zero. The score still computes
 * and still helps, because the content advice survives a re-export.
 */
export type Blocker = {
  label: string;
  detail: string;
  basis: Basis;
};

export type Score = {
  value: number;
  band: "clean" | "minor" | "risky" | "broken";
  verdict: string;
  deductions: Deduction[];
  /** Shown above the score, never folded into it. */
  blockers: Blocker[];
  /** Checks the format cannot fail, so the score does not pretend it passed. */
  skipped: string[];
  /** Deduplicated citations behind whatever was deducted. */
  sources: Basis[];
};

const GREENHOUSE_PARSE: Basis = {
  claim:
    "Greenhouse lists graphics, tables, headers and footers, contact details in a text box, multi-column layouts and inconsistent section formatting as causes of a failed or partial parse.",
  source: "Greenhouse Support, Unsuccessful resume parse",
  url: "https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse",
};

const GREENHOUSE_LIMITS: Basis = {
  claim:
    "Greenhouse cannot parse a resume larger than 2.5MB, and a resume uploaded as an image rather than a document will not parse at all.",
  source: "Greenhouse Support, supported formats and parse limits",
  url: "https://support.greenhouse.io/hc/en-us/articles/360052218132-Supported-formats-for-resumes-cover-letters-and-other-candidate-uploads",
};

const LAYOUT_PAPER: Basis = {
  claim:
    "Around 20% of real resumes use a non-linear multi-column layout; removing layout-aware reordering costs 10+ accuracy points, and long descriptions fall to F1 0.55 without it.",
  source: "Layout-Aware Parsing Meets Efficient LLMs, arXiv 2510.09722 (2025)",
  url: "https://arxiv.org/html/2510.09722v1",
};

const FIELD_RELIABILITY: Basis = {
  claim:
    "Dates and named entities are extracted at F1 0.95 to 0.97 when present, so a missing date is a gap in the document rather than a parsing risk.",
  source: "Layout-Aware Parsing Meets Efficient LLMs, arXiv 2510.09722 (2025)",
  url: "https://arxiv.org/html/2510.09722v1",
};

const HIDDEN_WORKERS: Basis = {
  claim:
    "88% of employers say qualified candidates are screened out because they do not match the exact criteria in the job description; over 90% use a recruiting system to make the first cut.",
  source: "Hidden Workers: Untapped Talent, Harvard Business School and Accenture (2021)",
  url: "https://www.hbs.edu/managing-the-future-of-work/Documents/research/hiddenworkers09032021.pdf",
};

/**
 * What a missing field costs.
 *
 * Contact details sit at the top because a record nobody can search or reply
 * to is inert, whatever else is in it. Dates were reduced from 18 to 12 once
 * the measurement data showed parsers read them reliably.
 */
export const FIELD_COSTS: Record<
  string,
  { cost: number; detail: string; basis: Basis }
> = {
  name: {
    cost: 14,
    detail:
      "No line reads as a name, so the record has nobody attached to it. Greenhouse names contact details in a header, footer or text box as a specific cause of this.",
    basis: GREENHOUSE_PARSE,
  },
  email: {
    cost: 18,
    detail:
      "No address found. Recruiters filter on exact criteria, and a profile with no contact route cannot be actioned even when it matches.",
    basis: HIDDEN_WORKERS,
  },
  phone: {
    cost: 7,
    detail: "No phone number found in the text.",
    basis: GREENHOUSE_PARSE,
  },
  links: {
    cost: 3,
    detail: "No portfolio or profile URL.",
    basis: FIELD_RELIABILITY,
  },
  sections: {
    cost: 15,
    detail:
      "No headings a parser recognises. Greenhouse lists inconsistent section formatting as a parse failure, and renaming a standard heading is enough to drop the section it contains.",
    basis: GREENHOUSE_PARSE,
  },
  dates: {
    cost: 12,
    detail:
      "No start and end dates found. Parsers read dates reliably when they are there, so this reads as missing from the document rather than lost in transit.",
    basis: FIELD_RELIABILITY,
  },
};

export const FLAG_COSTS: Record<
  string,
  { cost: number; label: string; basis: Basis }
> = {
  noTextLayer: {
    cost: 100,
    label: "No text layer",
    basis: GREENHOUSE_LIMITS,
  },
  emptyText: { cost: 100, label: "No text", basis: GREENHOUSE_LIMITS },
  /**
   * One finding for one defect.
   *
   * A column layout is what causes reading order to scramble, so charging
   * `readingOrder` 22 and `multiColumn` 20 billed 42 points twice for the same
   * problem. Both detectors still run, and `triggeredBy` records which fired,
   * because knowing whether the columns were detected geometrically or only
   * inferred from the emission order is what makes the advice specific.
   *
   * 28 is a judgement call: 22 was the higher of the two, and a column layout
   * carries marginal risk beyond order scrambling because it also confuses
   * section boundaries.
   */
  layoutOrder: {
    cost: 28,
    label: "Column layout and reading order",
    basis: LAYOUT_PAPER,
  },
  textbox: { cost: 18, label: "Text box", basis: GREENHOUSE_PARSE },
  headerContent: { cost: 16, label: "Page header", basis: GREENHOUSE_PARSE },
  table: { cost: 13, label: "Table", basis: GREENHOUSE_PARSE },
  footerContent: { cost: 9, label: "Page footer", basis: GREENHOUSE_PARSE },
  /**
   * Reported, not charged.
   *
   * A photo is expected on a resume in much of Europe and most of Asia, so
   * costing points would mark a document down for following its own market's
   * convention, which docs/04-ats-rules.md rules out: state both, and let the
   * person decide. The risk is not the picture, it is information that exists
   * only inside it, and the finding says exactly that.
   */
  image: { cost: 0, label: "Picture", basis: LAYOUT_PAPER },
};

/**
 * Greenhouse stops parsing at 2.5MB, whatever the upload limit says. Not fatal
 * everywhere, since other vendors accept more, but it is a documented hard
 * failure at one of the five systems most people will meet.
 */
export const PARSE_SIZE_LIMIT = 2.5 * 1024 * 1024;

/**
 * Cost of exceeding it.
 *
 * This was 30, our heaviest scored finding, on a misreading. Greenhouse cannot
 * *parse* above 2.5MB, but it accepts uploads to 100MB: the file attaches, and
 * a recruiter types the fields in by hand. Nobody is rejected. Auto-fill is
 * what fails, and a hand-keyed candidate is harder to surface in a database
 * search than a parsed one.
 *
 * 10 is a judgement call, not a sourced number. 30 was indefensible either way.
 */
export const OVERSIZE_COST = 10;

/**
 * Unfilled template text. Costs what a lost employer name costs, because that
 * is the usual consequence: the parser skips the field entirely.
 */
export const PLACEHOLDER_COST = 20;

/**
 * The ceiling is 98, not 100.
 *
 * No parser is guaranteed, none of them publish their rules, and a perfect
 * score would be a claim about software we cannot see. Two points is the
 * honest cost of that.
 */
export const CEILING = 98;

/**
 * Where one severity label stops and the next begins.
 *
 * Exported so the generated formula document quotes the real thresholds rather
 * than a copy somebody has to remember to update.
 */
export const SEVERITY_FLOOR = {
  blocking: 100,
  high: 16,
  medium: 10,
  low: 0,
} as const;

function severity(cost: number): Severity {
  if (cost >= SEVERITY_FLOOR.blocking) return "blocking";
  if (cost >= SEVERITY_FLOOR.high) return "high";
  if (cost >= SEVERITY_FLOOR.medium) return "medium";
  return "low";
}

/**
 * Score at or above which each band starts.
 *
 * Rebased when the aggregate went multiplicative, because 85 / 65 / 40 were
 * set against a subtractive scale and multiplying compresses the middle.
 *
 * Set by what each band should mean, not by a histogram. The only corpus we
 * have is the seventeen fixtures in testing/, which were built to exercise
 * specific detectors rather than to represent real resumes, so gaps in that
 * distribution are artefacts of what we chose to build. Reading band
 * boundaries off it would be measurement theatre.
 *
 * What they mean instead: clean is nothing structural, so a document whose
 * only finding is an absent portfolio link stays there. Minor starts below a
 * single moderate structural fault, so one table or one page header drops you
 * out of clean. Risky starts where a contact field or a section is at stake.
 * Broken is reserved for documents where most content is at risk.
 *
 * Revisit against a real corpus. Until one exists, this is a judgement call
 * and the generated formula document says so.
 */
export const BAND_FLOOR = {
  clean: 88,
  minor: 70,
  risky: 40,
  broken: 0,
} as const;

function band(value: number): Score["band"] {
  if (value >= BAND_FLOOR.clean) return "clean";
  if (value >= BAND_FLOOR.minor) return "minor";
  if (value >= BAND_FLOOR.risky) return "risky";
  return "broken";
}

export const VERDICTS: Record<Score["band"], string> = {
  clean: "Should come through intact.",
  minor: "Will parse, with some detail lost.",
  risky: "Expect fields to go missing.",
  broken: "Most of this will not survive.",
};

function finish(
  deductions: Deduction[],
  skipped: string[],
  blockers: Blocker[] = [],
): Score {
  // Heaviest first: the top line should be the thing to fix.
  deductions.sort((a, b) => b.cost - a.cost);

  /*
   * Multiplicative, not subtractive.
   *
   * The costs summed to 197 against a 98 ceiling, so the top half of the range
   * did nothing and a document deep enough to clip stopped responding to
   * fixes. Multiplying cannot go below zero, so nothing clips at any finding
   * count and every fix moves the number. Marginal gain now scales with what
   * is left to gain rather than being a flat 13 points for a table whether the
   * resume is pristine or wrecked.
   *
   * A fatal finding costs 100, so its factor is zero and the score reaches
   * zero through the same arithmetic as everything else. No special case.
   */
  const value = Math.round(
    deductions.reduce((acc, d) => acc * (1 - d.cost / 100), CEILING),
  );

  const sources: Basis[] = [];
  for (const d of deductions) {
    if (!sources.some((s) => s.url === d.basis.url && s.claim === d.basis.claim)) {
      sources.push(d.basis);
    }
  }

  return {
    value,
    band: band(value),
    verdict: VERDICTS[band(value)],
    deductions,
    blockers,
    skipped,
    sources,
  };
}

export function scoreExtraction(
  extraction: Extraction,
  fields: Recovered[],
  /** File size, when known. Only used for the documented 2.5MB parse limit. */
  bytes?: number,
  /** Source extension, when known. Only used for the acceptance blocker. */
  ext?: string,
): Score {
  /*
   * Acceptance is checked before anything else, and stays out of the score.
   * A file the portal refuses never reaches a parser, so a number describing
   * how well it would have parsed is beside the point. The report still runs,
   * because the same content advice applies once they re-export.
   */
  const blockers: Blocker[] = [];
  if (ext !== undefined && !ATS_ACCEPTED.has(ext)) {
    blockers.push({
      label: `${ext} is not an accepted format`,
      detail: `Greenhouse accepts .pdf, .docx, .rtf and .txt, and will not take a ${ext} file. Export as PDF or Word before applying.`,
      basis: GREENHOUSE_LIMITS,
    });
  }

  /*
   * No text is the end of the conversation, and it does not depend on a flag
   * having been raised: an extractor that returns nothing should score zero
   * whether or not it remembered to say why.
   */
  if (!extraction.text.trim()) {
    return finish(
      [
        {
          label: extraction.hasTextLayer === false ? "No text layer" : "No text",
          cost: 100,
          severity: "blocking",
          detail:
            extraction.flags[0]?.detail ??
            "Nothing could be read out of this file. A resume uploaded as an image does not parse at all.",
          basis: GREENHOUSE_LIMITS,
        },
      ],
      [],
      blockers,
    );
  }

  const deductions: Deduction[] = [];

  for (const field of fields) {
    if (field.value !== null) continue;
    const cost = FIELD_COSTS[field.key];
    if (cost) {
      deductions.push({
        label: `Missing ${field.key}`,
        cost: cost.cost,
        severity: severity(cost.cost),
        detail: cost.detail,
        basis: cost.basis,
      });
    }
  }

  for (const flag of extraction.flags) {
    const cost = FLAG_COSTS[flag.kind];
    if (!cost) continue;
    deductions.push({
      label: cost.label,
      cost: cost.cost,
      severity: severity(cost.cost),
      detail: flag.detail,
      basis: cost.basis,
    });
  }

  /*
   * Columns and reading order, billed once. Both detectors ran above and were
   * skipped by the FLAG_COSTS lookup, because neither has an entry of its own
   * any more.
   */
  const layoutFlags = extraction.flags.filter(
    (f) => f.kind === "multiColumn" || f.kind === "readingOrder",
  );
  if (layoutFlags.length > 0) {
    const merged = FLAG_COSTS.layoutOrder;
    deductions.push({
      label: merged.label,
      cost: merged.cost,
      severity: severity(merged.cost),
      detail: layoutFlags.map((f) => f.detail).join(" "),
      basis: merged.basis,
      triggeredBy: layoutFlags.map((f) => f.kind),
    });
  }

  const spacing = detectLetterSpacing(extraction.text);
  if (spacing.longest > 0) {
    const tier =
      SPACING_TIERS.find((t) => spacing.share > t.over) ??
      SPACING_TIERS[SPACING_TIERS.length - 1];
    deductions.push({
      label: tier.label,
      cost: tier.cost,
      severity: severity(tier.cost),
      detail: `Text written with a space between every letter${
        spacing.sample ? ` ("${spacing.sample}")` : ""
      }. A parser cannot join the characters back into words, so this contributes no searchable terms at all. Set the letter spacing back to normal instead of typing the gaps.`,
      basis: GREENHOUSE_PARSE,
    });
  }

  const placeholders = findPlaceholders(
    extraction.text,
    fields.map((f) => f.value),
  );
  if (placeholders.hits.length > 0) {
    deductions.push({
      label: "Unfilled template text",
      cost: PLACEHOLDER_COST,
      severity: severity(PLACEHOLDER_COST),
      detail: `"${placeholders.hits[0]}" looks like template text nobody filled in. Parsers skip data they read as placeholder, and a recruiter will read it the same way.`,
      basis: GREENHOUSE_PARSE,
    });
  }
  /*
   * Costs nothing, on purpose. We cannot tell a half-finished template from a
   * document somebody redacted deliberately, and charging for the second would
   * be punishing care. Worth saying out loud either way, so it rides along as
   * a zero-cost finding rather than a silent pass.
   */
  if (placeholders.advisory.length > 0) {
    deductions.push({
      label: "Reserved contact details",
      cost: 0,
      severity: severity(0),
      detail: `This resume carries ${placeholders.advisory.join(" and ")}, which are reserved for examples. Deliberate if you are sharing a redacted copy; if this is the version you are applying with, a recruiter cannot reach you.`,
      basis: GREENHOUSE_PARSE,
    });
  }

  if (bytes !== undefined && bytes > PARSE_SIZE_LIMIT) {
    deductions.push({
      label: "File size",
      cost: OVERSIZE_COST,
      severity: severity(OVERSIZE_COST),
      detail:
        "Over 2.5MB. Greenhouse will not auto-fill your details from a file this large, so a recruiter has to type them in. Your application still goes through. Usually an embedded image or a font that was not subset: compress the images or export at lower quality to get under the limit.",
      basis: GREENHOUSE_LIMITS,
    });
  }

  /*
   * Checks this format cannot fail are named rather than silently passed. A
   * plain-text file has no columns to get wrong, and scoring it as though it
   * survived a test it never sat is the kind of flattery that makes a number
   * worthless.
   */
  const skipped =
    extraction.depth === "layout"
      ? []
      : extraction.depth === "markup"
        ? ["Reading order", "Column layout", "Text layer"]
        : ["Reading order", "Column layout", "Text layer", "Tables"];

  return finish(deductions, skipped, blockers);
}
