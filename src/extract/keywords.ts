/**
 * Keyword overlap between a job posting and a resume.
 *
 * Deliberately not part of the score, and that is the whole design decision.
 * The score answers "can this file be read", which is a property of the file
 * and true regardless of where it is sent. Keyword overlap answers "does this
 * resume match this posting", which changes with every posting and says nothing
 * about parsing. Folding the two together is what makes competitor scores
 * untrustworthy: a resume is not worse because of a job the user has not
 * applied for.
 *
 * It earns a place next to the score because the HBS and Accenture survey found
 * 88% of employers screen out qualified candidates for not matching the exact
 * criteria in the posting. Exact criteria means exact words.
 *
 * What this is not: a rewriting service. It reports which terms from the
 * posting are absent, and leaves the judgement about whether they are honestly
 * yours to claim where it belongs.
 */

/**
 * Words that carry no signal in a job posting.
 *
 * Two groups: ordinary English function words, and recruiting boilerplate that
 * appears in every posting ever written. Without the second group the top terms
 * come back as "candidate", "team", "responsibilities" and "opportunity".
 */
const STOPWORDS = new Set([
  "a", "about", "above", "across", "after", "all", "also", "an", "and", "any",
  "are", "as", "at", "be", "been", "being", "both", "but", "by", "can", "could",
  "do", "does", "doing", "each", "either", "etc", "for", "from", "had", "has",
  "have", "having", "he", "her", "here", "his", "how", "if", "in", "into", "is",
  "it", "its", "just", "may", "might", "more", "most", "must", "no", "nor",
  "not", "of", "off", "on", "once", "only", "or", "other", "our", "out", "over",
  "own", "per", "same", "she", "should", "so", "some", "such", "than", "that",
  "the", "their", "them", "then", "there", "these", "they", "this", "those",
  "through", "to", "too", "under", "up", "us", "very", "was", "we", "were",
  "what", "when", "where", "which", "while", "who", "will", "with", "within",
  "would", "you", "your",
  // Recruiting boilerplate.
  "ability", "able", "about", "across", "applicant", "apply", "background",
  "benefits", "candidate", "candidates", "career", "closely", "collaborate",
  "company", "culture", "day", "deep", "demonstrated", "desirable", "detail",
  "duties", "employer", "environment", "equal", "essential", "excellent",
  "experience", "fast", "field", "focus", "following", "good", "great", "help",
  "high", "highly", "including", "job", "join", "key", "level", "like", "looking",
  "make", "meet", "minimum", "months", "need", "new", "offer", "opportunity",
  "paced", "part", "plus", "position", "preferred", "proven", "qualifications",
  "related", "relevant", "requirement", "requirements", "responsibilities",
  "responsible", "role", "salary", "similar", "skills", "solid", "strong",
  "successful", "support", "team", "teams", "thing", "things", "time", "understanding",
  "us", "using", "want", "well", "work", "working", "world", "year", "years",
  /*
   * The words that mark how hard a posting asks. They are read for emphasis
   * (see segmentPosting) and must not also be offered as terms: "you are
   * missing required" is not advice, and they outranked real skills because
   * every requirements list repeats them.
   */
  "bonus", "desirable", "essential", "familiarity", "ideally", "knowledge",
  "mandatory", "must", "nice", "prefer", "preferably", "require", "required",
  "requires", "expertise", "proficiency", "proficient", "familiar",
]);

/**
 * Kept inside a token: plus for C++, hash for C#, dot for .NET and Node.js,
 * slash for CI/CD, hyphen for well-known compounds.
 */
const TOKEN = /[.#]?[a-z0-9](?:[a-z0-9+#./-]*[a-z0-9+#])?/g;

/** How many terms to report. Beyond this it stops being a list and becomes noise. */
export const MAX_TERMS = 24;

/**
 * When repetition stops being emphasis and starts being padding. Both
 * conditions have to hold: an absolute count, and a multiple of what the
 * posting actually asked for.
 */
export const STUFFING = { timesInResume: 5, timesAsked: 2 } as const;

/** Count only, for the generated formula document. */
export const STOPWORD_COUNT = () => STOPWORDS.size;

/**
 * Abbreviations and their expansions, matched in both directions.
 *
 * iCIMS Copilot matches literal terminology, so a posting asking for
 * `JavaScript` against a resume saying `JS` scores lower. Knowing that is
 * useful; scoring it as a match would not be, because the system doing the
 * screening will not.
 */
const EXPANSIONS: Readonly<Record<string, readonly string[]>> = {
  js: ["javascript"],
  ts: ["typescript"],
  k8s: ["kubernetes"],
  ml: ["machine learning"],
  ai: ["artificial intelligence"],
  aws: ["amazon web services"],
  gcp: ["google cloud platform"],
  qa: ["quality assurance"],
  ux: ["user experience"],
  ui: ["user interface"],
  sr: ["senior"],
  jr: ["junior"],
  mgr: ["manager"],
  dir: ["director"],
  vp: ["vice president"],
  exec: ["executive"],
  eng: ["engineer"],
  dev: ["developer"],
  admin: ["administrator"],
};

/**
 * Abbreviations with more than one honest reading. Every expansion is surfaced
 * and none is chosen, because guessing which one the posting meant is how a
 * tool ends up telling a project manager to describe themselves as a product
 * manager.
 */
const AMBIGUOUS: Readonly<Record<string, readonly string[]>> = {
  pm: ["product manager", "project manager", "program manager"],
  sa: ["solutions architect", "systems analyst"],
  cs: ["computer science", "customer success"],
};

/**
 * Both directions: `js` finds `javascript`, and `javascript` finds `js`.
 *
 * Compared on stems, because that is how terms are keyed everywhere else here.
 * `kubernetes` keys as `kubernete`, so a literal table lookup finds nothing.
 * The value returned is the unstemmed form, since it goes on screen.
 */
function stemPhrase(phrase: string): string {
  return phrase.split(" ").map(stem).join(" ");
}

function alternatesFor(stemmedTerm: string): string[] {
  const out = new Set<string>();
  for (const [abbr, expansions] of [
    ...Object.entries(EXPANSIONS),
    ...Object.entries(AMBIGUOUS),
  ]) {
    if (stemmedTerm === stemPhrase(abbr)) expansions.forEach((e) => out.add(e));
    if (expansions.some((e) => stemPhrase(e) === stemmedTerm)) out.add(abbr);
  }
  return [...out];
}

/** How many missing terms to put in front of someone at once. */
export const PRIORITY_LIMIT = 5;

/**
 * Distinct meaningful terms a posting must yield before any of this means
 * anything.
 *
 * Below it there is nothing to compare against, and every figure computed from
 * it misleads: a one-word box reported "1 of 1 terms" and then warned about
 * keyword stuffing, because a resume naturally says the word more often than
 * a one-word posting does. A real posting clears this several times over; the
 * bar is set to catch a stray word or a job title pasted on its own, not to
 * judge how well written the posting is.
 */
export const MIN_POSTING_TERMS = 8;

export type TermMatch = {
  term: string;
  /** How hard the posting asked. See segmentPosting. */
  emphasis: Emphasis;
  /** Times it appears in the posting. A term asked for twice matters more. */
  askedFor: number;
  /** Times it appears in the resume. Zero means missing. */
  found: number;
  /**
   * Present, but written differently from the posting. Holds what the resume
   * says. Deliberately not counted as a match: the ATS matches literal text,
   * so counting it would flatter the coverage figure with something the system
   * will not credit. Rendered as an action instead.
   */
  nearMiss?: string;
};

export type KeywordReport = {
  /**
   * Whether the pasted text was enough to compare against at all.
   *
   * False means every other field is empty rather than wrong: a report built
   * from two words is not a weak report, it is a meaningless one, and showing
   * it as though it were a result is worse than showing nothing.
   */
  usable: boolean;
  terms: TermMatch[];
  matched: number;
  /**
   * Matched over total, 0 to 1. An overlap figure, not a score, and never
   * combined with the parse score.
   */
  coverage: number;
  /**
   * Terms repeated far more often than the posting asks for. Stuffing is
   * obvious to a human reader and to modern matching, and it costs interviews.
   */
  overused: string[];
  /**
   * Terms present under another name. Counted in neither `matched` nor
   * `coverage`, so the figures stay literal.
   */
  nearMisses: TermMatch[];
  /**
   * Coverage of what the posting insists on, reported separately.
   *
   * Overall coverage flattens the difference between a wishlist item and a
   * filter. Someone matching 18 of 24 terms is in trouble if the six they
   * missed were all under Requirements, and fine if none of them were.
   */
  requiredTotal: number;
  requiredMatched: number;
  /** Missing terms in the order they are worth fixing. */
  priority: TermMatch[];
  /** Demands that are not keywords at all: years, degrees, seniority. */
  demands: Demand[];
};

function tokens(text: string): string[] {
  return text.toLowerCase().match(TOKEN) ?? [];
}

/**
 * Collapses plurals so "APIs" matches "API".
 *
 * Only ever used for comparison, never shown. An early version displayed the
 * stem and told people they were missing "kubernet", which is the usual reward
 * for stemming a proper noun. Display uses the word as written.
 */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  // "es" is only a plural after a sibilant: boxes, watches, classes. Anywhere
  // else it is part of the word, as in Kubernetes.
  if (word.length > 4 && /(?:s|x|z|ch|sh)es$/.test(word)) {
    return word.slice(0, -2);
  }
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

function meaningful(word: string): boolean {
  if (word.length < 2) return false;
  if (STOPWORDS.has(word)) return false;
  // A bare number is a salary, a year, or a headcount.
  if (/^\d+$/.test(word)) return false;
  return true;
}

/**
 * Counts single words and two-word phrases from the posting.
 *
 * Bigrams are kept because the useful terms are usually two words long, and a
 * resume that mentions "machine" and "learning" in unrelated sentences has not
 * matched "machine learning".
 */
type Candidate = { display: string; count: number; emphasis: Emphasis };

function collect(text: string): Map<string, Candidate> {
  const counts = new Map<string, Candidate>();

  /*
   * Keyed by stem for comparison, carrying the first surface form for display.
   * A term keeps the strongest framing it was ever given: something listed
   * under Requirements and mentioned again in the blurb is still required.
   */
  const bump = (key: string, display: string, emphasis: Emphasis) => {
    const existing = counts.get(key);
    if (!existing) {
      counts.set(key, { display, count: 1, emphasis });
      return;
    }
    existing.count += 1;
    if (RANK[emphasis] > RANK[existing.emphasis]) existing.emphasis = emphasis;
  };

  for (const segment of segmentPosting(text)) {
    const words = tokens(segment.text);
    words.forEach((word, i) => {
      if (meaningful(word)) bump(stem(word), word, segment.emphasis);

      const next = words[i + 1];
      if (!next) return;
      // Both halves must carry signal, which rules out "of experience".
      if (meaningful(word) && meaningful(next)) {
        bump(`${stem(word)} ${stem(next)}`, `${word} ${next}`, segment.emphasis);
      }
    });
  }

  return counts;
}

/* ------------------------------------------------------------------ *
 * How hard the posting asks
 *
 * A posting is not a flat bag of words. It has a requirements list and a
 * wishlist, and missing one item from each is not the same event: the first
 * gets you filtered, the second rarely does. Treating both as "missing term"
 * is what makes a coverage figure misleading, and sorting by frequency alone
 * buries the one term that actually disqualifies you under four that do not.
 *
 * Read from the posting's own structure rather than inferred: a heading sets
 * the mood for the lines under it, and a cue inside a line overrides it for
 * that line.
 * ------------------------------------------------------------------ */

export type Emphasis = "required" | "preferred" | "mentioned";

const RANK: Record<Emphasis, number> = { required: 2, preferred: 1, mentioned: 0 };

/** Headings that open a run of lines, and the weight they give them. */
const SECTION_CUES: [RegExp, Emphasis][] = [
  [/\b(?:minimum|basic|required)\s+(?:qualification|requirement|skill)/i, "required"],
  [/\b(?:requirements|qualifications|what\s+you(?:'ll)?\s+need|who\s+you\s+are|must\s+haves?)\b\s*:?\s*$/i, "required"],
  [/\b(?:preferred|desired|nice[\s-]to[\s-]have|bonus|good\s+to\s+have|pluses)\b/i, "preferred"],
  [/\b(?:responsibilities|what\s+you(?:'ll)?\s+do|about\s+(?:us|the\s+role)|benefits|perks)\b\s*:?\s*$/i, "mentioned"],
];

/** Cues that settle one line on their own, wherever it sits. */
const LINE_CUES: [RegExp, Emphasis][] = [
  [/\b(?:is\s+)?(?:a\s+)?(?:strong\s+)?plus\b|\bbonus\b|\bnice\s+to\s+have\b|\bpreferred\b|\bideally\b|\bdesirable\b|\bwould\s+be\s+great\b/i, "preferred"],
  [/\bmust\s+(?:have|be|possess)\b|\brequired\b|\brequirement\b|\bessential\b|\bmandatory\b|\bminimum\s+of\b|\bat\s+least\b|\byou\s+have\b/i, "required"],
];

type Segment = { text: string; emphasis: Emphasis };

/**
 * Splits a posting into lines carrying how hard each one asks.
 *
 * Postings arrive as pasted text, so the line is the only structure available.
 * A line's own cue wins over the heading above it: "Kubernetes a plus" inside
 * a Requirements list means what it says.
 */
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

  for (const text of units(posting)) {
    const heading = SECTION_CUES.find(([re]) => re.test(text));
    if (heading) {
      section = heading[1];
      // A bare heading carries no terms of its own; a heading with a sentence
      // attached still does.
      if (text.length < 60) continue;
    }

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

/** Beyond this the list stops being a checklist and becomes the posting again. */
export const MAX_DEMANDS = 6;

/** Occurrences of a term in already-stemmed resume tokens. */
function occurrences(term: string, haystack: string[]): number {
  const parts = term.split(" ");
  if (parts.length === 1) {
    return haystack.filter((w) => w === parts[0]).length;
  }
  let hits = 0;
  for (let i = 0; i < haystack.length - 1; i += 1) {
    if (haystack[i] === parts[0] && haystack[i + 1] === parts[1]) hits += 1;
  }
  return hits;
}

export function matchKeywords(
  posting: string,
  resumeText: string,
): KeywordReport {
  const haystack = tokens(resumeText).map(stem);
  const counts = collect(posting);

  /*
   * Ranked by how hard the posting asks first, then by how often, then by
   * phrase length. Frequency alone put a term repeated in the benefits blurb
   * above one listed once under Requirements, which is backwards: the second
   * is the one that filters. A two-word term is more specific than either half
   * of it, so an equal pair puts the phrase first.
   */
  const ranked = [...counts.entries()]
    .sort(
      (a, b) =>
        RANK[b[1].emphasis] - RANK[a[1].emphasis] ||
        b[1].count - a[1].count ||
        b[0].length - a[0].length,
    )
    .map(([key, { display, count, emphasis }]) => ({
      key,
      term: display,
      askedFor: count,
      emphasis,
      found: occurrences(key, haystack),
    }));

  /*
   * A word is dropped only when a phrase containing it was found in the
   * resume, so nobody is told they are missing "learning" directly under a
   * matched "machine learning". A missing phrase keeps its halves visible,
   * because which half is absent is the useful part.
   */
  const satisfied = new Set(
    ranked
      .filter((t) => t.found > 0 && t.key.includes(" "))
      .flatMap((t) => t.key.split(" ")),
  );

  const chosen: TermMatch[] = ranked
    .filter((t) => t.key.includes(" ") || !satisfied.has(t.key))
    .slice(0, MAX_TERMS)
    .map(({ key, term, askedFor, found, emphasis }) => {
      if (found > 0) return { term, askedFor, found, emphasis };
      // Only worth looking for an alternate spelling once the literal is absent.
      const nearMiss = alternatesFor(key).find(
        (alt) => occurrences(stemPhrase(alt), haystack) > 0,
      );
      return nearMiss
        ? { term, askedFor, found, emphasis, nearMiss }
        : { term, askedFor, found, emphasis };
    });

  /*
   * Whether there was enough here to be worth showing anyone.
   *
   * Counted on single words: the pairs derived from them would treat one word
   * repeated as a rich posting. The matching itself still runs, because the
   * mechanics are worth testing on two-word inputs; it is the reporting that
   * has to hold back.
   */
  const distinct = [...counts.keys()].filter((k) => !k.includes(" ")).length;
  const usable = distinct >= MIN_POSTING_TERMS;

  const matched = chosen.filter((t) => t.found > 0).length;
  const required = chosen.filter((t) => t.emphasis === "required");
  const requiredMatched = required.filter((t) => t.found > 0).length;

  return {
    usable,
    terms: chosen,
    matched,
    demands: findDemands(posting),
    requiredTotal: required.length,
    requiredMatched,
    /*
     * The missing terms in the order they are worth fixing: what the posting
     * insists on, before what it merely likes. A term present under another
     * name is left out, since rewording is a different job from adding.
     */
    priority: chosen
      .filter((t) => t.found === 0 && !t.nearMiss)
      .slice(0, PRIORITY_LIMIT),
    nearMisses: chosen.filter((t) => t.nearMiss !== undefined),
    coverage: chosen.length ? matched / chosen.length : 0,
    /*
     * Five times is generous for a document this short. Past that it reads as
     * padding rather than as emphasis.
     *
     * Silent on a posting too thin to judge against. A resume naturally says a
     * word more often than a two-word posting does, so this used to accuse
     * people of stuffing on the strength of nothing.
     */
    overused: !usable
      ? []
      : chosen
          .filter(
            (t) =>
              t.found > STUFFING.timesInResume &&
              t.found > t.askedFor * STUFFING.timesAsked,
          )
          .map((t) => t.term),
  };
}
