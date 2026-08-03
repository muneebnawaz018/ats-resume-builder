/**
 * Reading a posting's own structure.
 *
 * A posting is not a flat bag of words. It has a requirements list, a wishlist,
 * and a tail of pay and benefits, and missing one item from each is not the
 * same event: the first gets you filtered, the second rarely does, the third is
 * not asking for anything. Treating them alike is what makes a coverage figure
 * misleading, and sorting by frequency alone buries the one term that
 * disqualifies you under four that do not.
 *
 * Read rather than inferred: a heading sets the weight for the lines under it,
 * and a cue inside a line overrides it for that line.
 */

export type Emphasis = "required" | "preferred" | "mentioned";

export const RANK: Record<Emphasis, number> = {
  required: 2,
  preferred: 1,
  mentioned: 0,
};

/** Headings that open a run of lines, and the weight they give them. */
const SECTION_CUES: [RegExp, Emphasis][] = [
  [/\b(?:minimum|basic|required)\s+(?:qualification|requirement|skill)/i, "required"],
  [/\b(?:requirements|qualifications|must\s+haves?)\b\s*:?\s*$/i, "required"],
  /*
   * The same heading in the wording postings actually use. "What we're looking
   * for" is the most common form of it, and without this line every real
   * requirement under it ranked as a passing mention and fell off the end of
   * the list, while the wishlist above it ranked higher.
   */
  [/\bwhat\s+we(?:['’]re|\s+are)?\s+looking\s+for\b|\bwhat\s+you(?:['’]ll)?\s+(?:need|bring)\b|\bwho\s+you\s+are\b|\bskills?\s+(?:and|&)\s+experience\b/i, "required"],
  [/\b(?:preferred|desired|nice[\s-]to[\s-]have|bonus|good\s+to\s+have|pluses)\b/i, "preferred"],
  [/\b(?:responsibilities|what\s+you(?:['’]ll)?\s+do|about\s+the\s+role)\b\s*:?\s*$/i, "mentioned"],
];

/**
 * Blocks that are not asking for anything.
 *
 * Pay, benefits, the how-to-apply paragraph and the boilerplate about the
 * company are part of every posting and part of no candidate's decision about
 * what to put in a resume. Left in, they were offered as terms to add: the
 * priority list read "health dental", "dental 401k", "401k match", which is
 * advice to describe your own dental plan. Skipped outright rather than ranked
 * low, since there is no ranking at which they are worth a line.
 */
const NOISE_CUES =
  /^\s*(?:salary|compensation|pay(?:\s+range)?|base\s+pay|benefits?|perks?|to\s+apply|how\s+to\s+apply|application\s+process|equal\s+opportunit|eeo\b|about\s+us|our\s+(?:mission|values|culture))\b/i;

/** Cues that settle one line on their own, wherever it sits. */
const LINE_CUES: [RegExp, Emphasis][] = [
  [/\b(?:is\s+)?(?:a\s+)?(?:strong\s+)?plus\b|\bbonus\b|\bnice\s+to\s+have\b|\bpreferred\b|\bideally\b|\bdesirable\b|\bwould\s+be\s+great\b/i, "preferred"],
  [/\bmust\s+(?:have|be|possess)\b|\brequired\b|\brequirement\b|\bessential\b|\bmandatory\b|\bminimum\s+of\b|\bat\s+least\b|\byou\s+have\b/i, "required"],
];

export type Segment = { text: string; emphasis: Emphasis };

const BULLET = /^\s*(?:[-•*·▪]|\d{1,2}[.)])\s+/;

/**
 * Breaks a posting into the units a cue can sensibly apply to.
 *
 * Not lines. Pasted postings are usually hard-wrapped, which puts "…and
 * Terraform is" on one line and "required." on the next, so a line-based read
 * called the requirement a passing mention and handed the word "required" its
 * own line to be treated as a keyword. Wrapped prose is joined back up and
 * split on sentence ends instead; list items stay whole, because a bullet is
 * already one thought and often has no full stop.
 */
function units(posting: string): string[] {
  const out: string[] = [];
  let prose: string[] = [];

  const flushProse = () => {
    if (!prose.length) return;
    const joined = prose.join(" ").replace(/\s+/g, " ").trim();
    // Sentence ends, keeping the terminator with the sentence it closes.
    for (const sentence of joined.split(/(?<=[.;!?])\s+/)) {
      if (sentence.trim()) out.push(sentence.trim());
    }
    prose = [];
  };

  for (const raw of posting.split(/\r?\n/)) {
    const line = raw.trim();
    // A blank line and a bullet both end whatever prose was in progress.
    if (!line) {
      flushProse();
      continue;
    }
    if (BULLET.test(line) || /:\s*$/.test(line)) {
      flushProse();
      out.push(line);
      continue;
    }
    prose.push(line);
  }
  flushProse();
  return out;
}

export function segmentPosting(posting: string): Segment[] {
  const out: Segment[] = [];
  let section: Emphasis = "mentioned";
  let skipping = false;

  for (const text of units(posting)) {
    /*
     * A noise block runs until the next real heading. Without the end, "Nice
     * to have" carried on past its own bullets and stamped the salary line,
     * the benefits line and the how-to-apply paragraph as things the employer
     * would like to see, which is how "20 days PTO" became a term to add.
     */
    if (NOISE_CUES.test(text)) {
      skipping = true;
      continue;
    }

    const heading = SECTION_CUES.find(([re]) => re.test(text));
    if (heading) {
      section = heading[1];
      skipping = false;
      // A bare heading carries no terms of its own; a heading with a sentence
      // attached still does.
      if (text.length < 60) continue;
    }
    if (skipping) continue;

    const inline = LINE_CUES.find(([re]) => re.test(text));
    out.push({ text, emphasis: inline ? inline[1] : section });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Demands that are not keywords
 * ------------------------------------------------------------------ */

export type Demand = {
  kind: "experience" | "education" | "seniority";
  /** The posting's own words, so nothing is put in the employer's mouth. */
  text: string;
  emphasis: Emphasis;
};

const DEMAND_PATTERNS: [RegExp, Demand["kind"]][] = [
  [/\b\d{1,2}\s*\+?\s*(?:-\s*\d{1,2}\s*)?years?\b[^.;\n]{0,60}/i, "experience"],
  [/\b(?:bachelor|master|phd|doctorate|b\.?s\.?c?|m\.?s\.?c?|degree)\b[^.;\n]{0,50}/i, "education"],
  [/\b(?:senior|junior|lead|principal|staff|entry[\s-]level|mid[\s-]level|head\s+of)\b[^.;\n]{0,40}/i, "seniority"],
];

/** Beyond this the list stops being a checklist and becomes the posting again. */
export const MAX_DEMANDS = 6;

/**
 * Requirements a word-overlap check cannot see.
 *
 * "5+ years of React" is not the keyword React; a resume can match every term
 * in a posting and still be filtered on the number in front of one of them.
 * These are surfaced as things to check by eye, never verified: working out
 * someone's total experience from resume prose is guesswork, and guessing
 * wrong here would be worse than staying quiet.
 */
export function findDemands(posting: string): Demand[] {
  const seen = new Set<string>();
  const out: Demand[] = [];

  for (const segment of segmentPosting(posting)) {
    for (const [re, kind] of DEMAND_PATTERNS) {
      const hit = re.exec(segment.text)?.[0]?.trim().replace(/[,:]$/, "");
      if (!hit) continue;
      const key = `${kind}:${hit.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind, text: hit, emphasis: segment.emphasis });
    }
  }

  // Hard demands first: those are the ones that filter.
  return out
    .sort((a, b) => RANK[b.emphasis] - RANK[a.emphasis])
    .slice(0, MAX_DEMANDS);
}
