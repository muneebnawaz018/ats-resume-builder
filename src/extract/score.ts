import type { Recovered } from "./fields";
import type { Extraction } from "./types";

/**
 * A score, and every reason it is not 100.
 *
 * This is our parser's reading of the file, not a vendor's. Nobody outside
 * Workday knows what Workday scores, and a number presented as if it came from
 * one would be a lie. What it does measure is real: whether the text can be
 * read at all, whether the fields a recruiter's screen shows can be found, and
 * whether the document contains the structures that scramble extraction.
 *
 * Every deduction is listed with its cost. A score you cannot take apart is
 * asking to be trusted, and there is no reason to trust this one on sight.
 */
export type Deduction = {
  label: string;
  /** Points lost. Always positive; the caller subtracts. */
  cost: number;
  detail: string;
};

export type Score = {
  value: number;
  band: "clean" | "minor" | "risky" | "broken";
  verdict: string;
  deductions: Deduction[];
  /** Checks the format cannot fail, so the score does not pretend it passed. */
  skipped: string[];
};

/**
 * What each failure costs.
 *
 * Weighted by what actually loses you an interview, not by how easy it is to
 * detect. A missing email means nobody can contact you, which is worth more
 * than any layout problem; a missing portfolio link is worth almost nothing.
 */
const FIELD_COSTS: Record<string, { cost: number; detail: string }> = {
  name: {
    cost: 15,
    detail: "No line reads as a name, so the record has nobody attached to it.",
  },
  email: {
    cost: 20,
    detail: "No address found. This is the field recruiters filter on first.",
  },
  phone: { cost: 8, detail: "No phone number found in the text." },
  links: { cost: 3, detail: "No portfolio or profile URL." },
  sections: {
    cost: 16,
    detail:
      "No headings a parser recognises, so experience and education cannot be told apart.",
  },
  dates: {
    cost: 18,
    detail:
      "No start and end dates found. Years of experience is computed from these.",
  },
};

const FLAG_COSTS: Record<string, number> = {
  noTextLayer: 100,
  emptyText: 100,
  readingOrder: 22,
  multiColumn: 16,
  textbox: 14,
  table: 10,
  headerContent: 8,
  footerContent: 4,
};

const FLAG_LABELS: Record<string, string> = {
  noTextLayer: "No text layer",
  emptyText: "No text",
  readingOrder: "Reading order",
  multiColumn: "Two columns",
  textbox: "Text box",
  table: "Table",
  headerContent: "Page header",
  footerContent: "Page footer",
};

function band(value: number): Score["band"] {
  if (value >= 85) return "clean";
  if (value >= 65) return "minor";
  if (value >= 40) return "risky";
  return "broken";
}

const VERDICTS: Record<Score["band"], string> = {
  clean: "Should come through intact.",
  minor: "Will parse, with some detail lost.",
  risky: "Expect fields to go missing.",
  broken: "Most of this will not survive.",
};

export function scoreExtraction(
  extraction: Extraction,
  fields: Recovered[],
): Score {
  const deductions: Deduction[] = [];

  /*
   * No text is the end of the conversation, and it does not depend on a flag
   * having been raised: an extractor that returns nothing at all should score
   * zero whether or not it remembered to say why.
   */
  if (!extraction.text.trim()) {
    return {
      value: 0,
      band: "broken",
      verdict: VERDICTS.broken,
      deductions: [
        {
          label: extraction.hasTextLayer === false ? "No text layer" : "No text",
          cost: 100,
          detail:
            extraction.flags[0]?.detail ??
            "Nothing could be read out of this file, so there is nothing for a parser to score.",
        },
      ],
      skipped: [],
    };
  }

  for (const field of fields) {
    if (field.value !== null) continue;
    const cost = FIELD_COSTS[field.key];
    if (cost) {
      deductions.push({
        label: `Missing ${field.key}`,
        cost: cost.cost,
        detail: cost.detail,
      });
    }
  }

  for (const flag of extraction.flags) {
    const cost = FLAG_COSTS[flag.kind];
    if (!cost) continue;
    deductions.push({
      label: FLAG_LABELS[flag.kind] ?? flag.kind,
      cost,
      detail: flag.detail,
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

  const total = deductions.reduce((sum, d) => sum + d.cost, 0);
  const value = Math.max(0, Math.min(100, 100 - total));

  // Heaviest first: the top line of the list should be the thing to fix.
  deductions.sort((a, b) => b.cost - a.cost);

  return { value, band: band(value), verdict: VERDICTS[band(value)], deductions, skipped };
}
