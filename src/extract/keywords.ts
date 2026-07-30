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

export type TermMatch = {
  term: string;
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
type Candidate = { display: string; count: number };

function collect(text: string): Map<string, Candidate> {
  const words = tokens(text);
  const counts = new Map<string, Candidate>();

  // Keyed by stem for comparison, carrying the first surface form for display.
  const bump = (key: string, display: string) => {
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { display, count: 1 });
  };

  words.forEach((word, i) => {
    if (meaningful(word)) bump(stem(word), word);

    const next = words[i + 1];
    if (!next) return;
    // Both halves must carry signal, which rules out "of experience".
    if (meaningful(word) && meaningful(next)) {
      bump(`${stem(word)} ${stem(next)}`, `${word} ${next}`);
    }
  });

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

export function matchKeywords(
  posting: string,
  resumeText: string,
): KeywordReport {
  const haystack = tokens(resumeText).map(stem);
  const counts = collect(posting);

  /*
   * Ranked by how often the posting asks, then by phrase length. A two-word
   * term is more specific than either half of it, so when both are asked for
   * equally often the phrase leads.
   */
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[0].length - a[0].length)
    .map(([key, { display, count }]) => ({
      key,
      term: display,
      askedFor: count,
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
    .map(({ key, term, askedFor, found }) => {
      if (found > 0) return { term, askedFor, found };
      // Only worth looking for an alternate spelling once the literal is absent.
      const nearMiss = alternatesFor(key).find(
        (alt) => occurrences(stemPhrase(alt), haystack) > 0,
      );
      return nearMiss ? { term, askedFor, found, nearMiss } : { term, askedFor, found };
    });

  const matched = chosen.filter((t) => t.found > 0).length;

  return {
    terms: chosen,
    matched,
    nearMisses: chosen.filter((t) => t.nearMiss !== undefined),
    coverage: chosen.length ? matched / chosen.length : 0,
    // Five times is generous for a document this short. Past that it reads as
    // padding rather than as emphasis.
    overused: chosen
      .filter(
        (t) =>
          t.found > STUFFING.timesInResume &&
          t.found > t.askedFor * STUFFING.timesAsked,
      )
      .map((t) => t.term),
  };
}
