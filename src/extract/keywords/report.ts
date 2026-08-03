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

import {
  RANK,
  findDemands,
  segmentPosting,
  type Demand,
  type Emphasis,
} from "./segment";
import {
  ledByVerb,
  meaningful,
  standalone,
  stem,
  stemPhrase,
  tokens,
  words,
} from "./words";

/** How many terms to report. Beyond this it stops being a list and becomes noise. */
export const MAX_TERMS = 24;

/** How many missing terms to put in front of someone at once. */
export const PRIORITY_LIMIT = 5;

/**
 * When repetition stops being emphasis and starts being padding. Both
 * conditions have to hold: an absolute count, and a multiple of what the
 * posting actually asked for.
 */
export const STUFFING = { timesInResume: 5, timesAsked: 2 } as const;

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
 * `kubernetes` keys as `kubernet`, so a literal table lookup finds nothing.
 * The value returned is the unstemmed form, since it goes on screen.
 */
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

/**
 * Counts single words and two-word phrases from the posting.
 *
 * Bigrams are kept because the useful terms are usually two words long, and a
 * resume that mentions "machine" and "learning" in unrelated sentences has not
 * matched "machine learning".
 */
type Candidate = {
  display: string;
  count: number;
  emphasis: Emphasis;
  /** Written as a name somewhere in the posting. See words(). */
  proper: boolean;
};

function collect(text: string): Map<string, Candidate> {
  const counts = new Map<string, Candidate>();

  /*
   * Keyed by stem for comparison, carrying the first surface form for display.
   * A term keeps the strongest framing it was ever given: something listed
   * under Requirements and mentioned again in the blurb is still required.
   */
  const bump = (
    key: string,
    display: string,
    emphasis: Emphasis,
    proper: boolean,
  ) => {
    const existing = counts.get(key);
    if (!existing) {
      counts.set(key, { display, count: 1, emphasis, proper });
      return;
    }
    existing.count += 1;
    if (RANK[emphasis] > RANK[existing.emphasis]) existing.emphasis = emphasis;
    // Named once is named: "react" in prose does not undo "React" in a bullet.
    existing.proper ||= proper;
  };

  for (const segment of segmentPosting(text)) {
    const ws = words(segment.text);
    ws.forEach((word, i) => {
      const w = word.lower;
      if (standalone(w)) bump(stem(w), w, segment.emphasis, word.proper);

      const next = ws[i + 1];
      if (!next) return;
      // Both halves must carry signal, which rules out "of experience".
      if (meaningful(w) && meaningful(next.lower)) {
        bump(
          `${stem(w)} ${stem(next.lower)}`,
          `${w} ${next.lower}`,
          segment.emphasis,
          word.proper && next.proper,
        );
      }
    });
  }

  return counts;
}

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

type Ranked = {
  key: string;
  term: string;
  askedFor: number;
  emphasis: Emphasis;
  proper: boolean;
  found: number;
};

/**
 * How many of the reported terms any one tier may take, and how many may be
 * two-word phrases.
 *
 * Both caps exist because rank order alone produced a useless list. Sorting by
 * emphasis first meant a posting with a long requirements block filled all 24
 * slots before reaching "Nice to have", so Next.js, Jest and Playwright never
 * appeared at all, and the resume that matched three of them was told it
 * matched none. Sorting a phrase above its own halves meant a single
 * requirements bullet contributed "normal pull", "management forms" and
 * "explain technical", none of which anybody screens on.
 *
 * Unfilled slots are handed back, so a posting with no wishlist still reports
 * a full list.
 */
const TIER_CAP: Record<Emphasis, number> = {
  required: 14,
  preferred: 8,
  mentioned: 4,
};
const PHRASE_CAP = Math.floor(MAX_TERMS / 3);

function select(ranked: Ranked[]): Ranked[] {
  const out: Ranked[] = [];
  const spare: Ranked[] = [];
  const usedTier: Record<Emphasis, number> = {
    required: 0,
    preferred: 0,
    mentioned: 0,
  };
  let phrases = 0;

  for (const t of ranked) {
    const isPhrase = t.key.includes(" ");
    // A pair led by a verb is a sentence fragment, not a term. See LEADING_VERBS.
    if (isPhrase && ledByVerb(t.key)) continue;
    // A phrase past the cap is dropped outright, not held back: the ones that
    // lose are the tail of the phrase ranking, which is where the noise lives.
    // A term held out by its tier's cap is only waiting for a free slot.
    if (isPhrase && phrases >= PHRASE_CAP) continue;
    if (usedTier[t.emphasis] >= TIER_CAP[t.emphasis]) {
      spare.push(t);
      continue;
    }
    usedTier[t.emphasis] += 1;
    if (isPhrase) phrases += 1;
    out.push(t);
    if (out.length === MAX_TERMS) return out;
  }

  // Whatever the caps left on the table, in the order it was already ranked.
  for (const t of spare) {
    if (out.length === MAX_TERMS) break;
    out.push(t);
  }
  return out;
}

/**
 * Drops a word that never appears outside a phrase already on the list.
 *
 * "Review your teammates' pull requests" contributed the phrase and both
 * halves, so the list read `pull requests | requests | pull` and the priority
 * advice told someone to add "pull" three ways. A word is kept when it is
 * asked for more often than the phrase containing it, which is the case for
 * JavaScript in a posting that says "production JavaScript" once and
 * "JavaScript" again on its own.
 *
 * A name is never redundant. "CI/CD ownership" contains CI/CD, and CI/CD is
 * the string the screening system looks for; dropping it in favour of the
 * longer phrase hides the term that actually matches.
 */
function dropRedundantHalves(chosen: Ranked[]): Ranked[] {
  const inPhrase = new Map<string, number>();
  for (const t of chosen) {
    if (!t.key.includes(" ")) continue;
    for (const half of t.key.split(" ")) {
      inPhrase.set(half, Math.max(inPhrase.get(half) ?? 0, t.askedFor));
    }
  }
  return chosen.filter(
    (t) =>
      t.key.includes(" ") ||
      t.proper ||
      (inPhrase.get(t.key) ?? 0) < t.askedFor,
  );
}

export function matchKeywords(
  posting: string,
  resumeText: string,
): KeywordReport {
  const haystack = tokens(resumeText).map(stem);
  const counts = collect(posting);

  /*
   * Ranked by how hard the posting asks, then by whether it is a name, then by
   * how often, then by length. Frequency alone put a term repeated in the
   * benefits blurb above one listed once under Requirements, which is
   * backwards: the second is the one that filters. The name test is what
   * separates React from comfortable when a bullet asks for both once.
   */
  const ranked: Ranked[] = [...counts.entries()]
    .sort(
      (a, b) =>
        RANK[b[1].emphasis] - RANK[a[1].emphasis] ||
        Number(b[1].proper) - Number(a[1].proper) ||
        b[1].count - a[1].count ||
        b[0].length - a[0].length,
    )
    .map(([key, { display, count, emphasis, proper }]) => ({
      key,
      term: display,
      askedFor: count,
      emphasis,
      proper,
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

  const chosen: TermMatch[] = dropRedundantHalves(
    select(ranked.filter((t) => t.key.includes(" ") || !satisfied.has(t.key))),
  ).map(({ key, term, askedFor, found, emphasis }) => {
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
