/**
 * Turning posting and resume text into comparable words.
 *
 * Tokenising, stemming and the stop list live together because they only make
 * sense together: a token is whatever the stemmer can be trusted with, and a
 * stop word is whatever survives tokenising and still says nothing.
 */

import { stemmer } from "stemmer";
import { eng } from "stopword";

/**
 * Recruiting boilerplate, on top of the English function words.
 *
 * The library list covers "the", "and", "with". It has no idea that every
 * posting ever written says "candidate", "team", "responsibilities" and
 * "opportunity", which is what the top terms came back as before this list
 * existed. Three groups: filler nouns, the words that mark how hard a posting
 * asks (read for emphasis in segment.ts, so never offered as terms of their
 * own), and the tails left behind when an apostrophe splits a contraction.
 */
const RECRUITING = [
  "ability", "able", "applicant", "apply", "background", "benefits",
  "candidate", "candidates", "career", "closely", "collaborate", "company",
  "culture", "day", "deep", "demonstrated", "detail", "duties", "employer",
  "environment", "equal", "excellent", "experience", "fast", "field", "focus",
  "following", "good", "great", "help", "high", "highly", "including", "job",
  "join", "key", "level", "like", "looking", "make", "meet", "minimum",
  "months", "need", "new", "offer", "opportunity", "paced", "part", "plus",
  "position", "proven", "qualifications", "related", "relevant", "requirement",
  "requirements", "responsibilities", "responsible", "role", "salary",
  "similar", "skills", "solid", "strong", "successful", "support", "team",
  "teams", "thing", "things", "time", "understanding", "using", "want", "well",
  "work", "working", "world", "year", "years", "etc", "us", "full-time",
  "part-time",
  // How hard the posting asks. "You are missing required" is not advice.
  "bonus", "desirable", "essential", "familiar", "familiarity", "ideally",
  "knowledge", "mandatory", "must", "nice", "prefer", "preferably", "preferred",
  "proficiency", "proficient", "require", "required", "requires", "expertise",
  // Contraction tails: "you've built" was offered as the term "ve built".
  "ve", "ll", "re", "don", "doesn", "isn", "aren", "won", "didn",
];

const STOPWORDS = new Set([...eng, ...RECRUITING]);

/** Count only, for the generated formula document. */
export const STOPWORD_COUNT = () => STOPWORDS.size;

/** The library's English function words, without the recruiting additions. */
const FUNCTION_WORDS = new Set(eng);

/**
 * The share of a text's tokens that are English function words.
 *
 * A posting is written in sentences, so between a third and a half of it is
 * "the", "with", "and", "you". Something that is not English prose at all --
 * a keyboard mash, a paste from the wrong window, a base64 blob -- has almost
 * none, whatever its word count.
 *
 * Reported as a ratio rather than tested here, because what counts as too low
 * depends on how much text there is: a pasted list of twelve skills honestly
 * contains no function words and is not junk.
 */
export function functionWordRatio(all: readonly string[]): number {
  if (!all.length) return 0;
  return all.filter((t) => FUNCTION_WORDS.has(t)).length / all.length;
}

/**
 * Kept inside a token: plus for C++, hash for C#, dot for .NET and Node.js,
 * slash for CI/CD, hyphen for well-known compounds.
 *
 * Any letter, not the ASCII range. This is an English-language tool and the
 * letters are still not all English: "résumé", "café" and "façade" are the
 * words people write, and the names are worse. Zoë, Muñoz, Björn and Nestlé
 * are ordinary things to find on a resume, and against `[a-z]` every one of
 * them broke into fragments at the accent -- "Zoë Muñoz" came back as
 * ["zo", "mu", "oz"], and "résumé" as ["r", "sum"], which then matched the
 * word "sum".
 */
const TOKEN = /[.#]?[\p{L}\p{N}](?:[\p{L}\p{N}+#./-]*[\p{L}\p{N}+#])?/gu;

/** Case-preserving, so capitalisation can be read before it is thrown away. */
const TOKEN_RAW = new RegExp(TOKEN.source, "giu");

/**
 * A slash joins a compound only when both sides are short.
 *
 * Kept for CI/CD and A/B. Without the length test "React/TypeScript" came
 * through as one token, which is a term no resume contains and, worse, meant
 * React itself was never counted.
 */
function splitSlash(word: string): string[] {
  const parts = word.split("/");
  if (parts.length === 1) return parts;
  if (parts.every((p) => p.length > 0 && p.length <= 3)) return [word];
  return parts.filter(Boolean);
}

/**
 * Porter stemming, so "APIs" matches "API" and "managing" matches "management".
 *
 * Only ever used for comparison, never shown: the stem of Kubernetes is
 * "kubernet", and telling someone they are missing that is the usual reward
 * for stemming a proper noun. Display uses the word as written.
 *
 * Names are left alone. Porter assumes English morphology, so it reads the
 * tail of "next.js" as an inflection and returns "next.j". Anything with
 * punctuation or a digit in it is a product name, not an English word.
 */
/**
 * Accents removed, for comparison only.
 *
 * A posting says Nestlé and the resume says Nestle, or the posting was pasted
 * out of a system that stripped the accent on the way. Both are the same
 * employer and a keyword check that says otherwise is reporting a difference
 * nobody made. Folding costs the distinction between año and ano, which is a
 * real word pair in a language this tool does not read anyway.
 *
 * Only ever applied to the comparison key. Display keeps the accent, because
 * the accent is how the person wrote their name.
 */
function fold(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "");
}

/*
 * Stemming is pure and repetitive: a posting says "engineering" a dozen times
 * and the resume says it a dozen more, and every pass over either text stems
 * every token again. The cache is keyed on the word as written.
 *
 * Capped, because the key space is whatever text gets pasted in, and a cache
 * that only grows is a leak with a friendly name. At the limit it is cleared
 * rather than evicted one by one: which entries are hot is not worth tracking
 * for a table this size.
 */
const STEM_CACHE = new Map<string, string>();
const STEM_CACHE_LIMIT = 20_000;

export function stem(word: string): string {
  const hit = STEM_CACHE.get(word);
  if (hit !== undefined) return hit;

  const folded = fold(word);
  const stemmed = /[^a-z]/.test(folded) ? folded : stemmer(folded);

  if (STEM_CACHE.size >= STEM_CACHE_LIMIT) STEM_CACHE.clear();
  STEM_CACHE.set(word, stemmed);
  return stemmed;
}

export function stemPhrase(phrase: string): string {
  return phrase.split(" ").map(stem).join(" ");
}

export function tokens(text: string): string[] {
  return (text.toLowerCase().match(TOKEN) ?? []).flatMap(splitSlash);
}

/**
 * Verbs that open a bullet in a posting, and the pairs they drag in with them.
 *
 * Every "what you'll do" list is written as instructions, so pairing adjacent
 * words produced "writing production", "explain technical", "review pull".
 * They read as terms and are not: no screening system has ever looked for
 * "explain technical".
 *
 * Only the leading half is tested. "technical writing" is a real thing to be
 * hired for, and this must not touch it. The stems are stored, since that is
 * what the keys are built from.
 *
 * A part-of-speech tagger would be the principled way to do this. Tried, and
 * on a posting made of bullet fragments rather than sentences it tagged
 * "hooks", "state", "forms" and "REST" as verbs. Losing REST API to be rid of
 * "explain technical" is a worse report, not a better one. This list only
 * holds words that no one is hired for on their own, so it can be wrong in
 * one direction only.
 */
const LEADING_VERBS = new Set(
  [
    "build", "building", "maintain", "maintaining", "write", "writing",
    "review", "reviewing", "explain", "explaining", "debug", "debugging",
    "ship", "shipping", "keep", "keeping", "turn", "turning", "grow",
    "growing", "help", "helping", "own", "owning", "ensure", "ensuring",
    "deliver", "delivering", "drive", "driving", "collaborate", "partner",
    "handle", "handling", "perform", "performing", "provide", "providing",
    "assist", "assisting", "participate", "contribute", "contributing",
  ].map(stem),
);

/** True when a two-word key opens with one of those verbs. */
export function ledByVerb(key: string): boolean {
  return LEADING_VERBS.has(key.split(" ")[0]);
}

/**
 * Whether a word is worth reporting by itself.
 *
 * Stricter than `meaningful`, and only for single words: a bare instruction
 * verb is useless advice ("you are missing: write"), but the same word can be
 * the second half of a real term, so it must still be allowed into a pair.
 * Dropping it outright cost us "technical writing", which is a job.
 */
export function standalone(word: string): boolean {
  return meaningful(word) && !LEADING_VERBS.has(stem(word));
}

export function meaningful(word: string): boolean {
  if (word.length < 2) return false;
  if (STOPWORDS.has(word)) return false;
  // A number is a salary, a year, or a headcount. "2+" from "2+ years" counts
  // as one: it is the years demand, reported there. A digit that starts a real
  // name is always followed by letters, as in 401k.
  if (/^\p{N}/u.test(word) && !/\p{L}/u.test(word)) return false;
  return true;
}

/**
 * Words with a note on whether the posting wrote them as a name.
 *
 * A capital letter is the only signal in a plain-text posting that separates
 * React from comfortable. Both are asked for once in the same bullet, and one
 * of them is a thing to put on a resume.
 */
export type Word = { lower: string; proper: boolean };

export function words(text: string): Word[] {
  const raw = text.match(TOKEN_RAW) ?? [];
  const out: Word[] = [];
  /*
   * A capital at the start of a unit is normally just a sentence opening, but
   * a bullet of two or three words is a list entry rather than a sentence, so
   * "- Next.js" is a name in the only position it could occupy.
   */
  const terse = raw.length <= 3;
  raw.forEach((token, i) => {
    for (const part of splitSlash(token)) {
      out.push({
        lower: part.toLowerCase(),
        /*
         * A leading capital counts away from the start of a unit. An interior
         * capital counts anywhere: TypeScript and jQuery are names wherever
         * they sit. So is anything spelled with punctuation or a digit, since
         * node.js, c++, c# and s3 are not English words.
         */
        proper:
          ((i > 0 || terse) && /^\p{Lu}/u.test(part)) ||
          /\p{Lu}/u.test(part.slice(1)) ||
          /[.+#]|\p{N}/u.test(part),
      });
    }
  });
  return out;
}
