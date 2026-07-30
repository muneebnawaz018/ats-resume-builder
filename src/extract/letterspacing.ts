/**
 * Letter-spaced text: `S O F T W A R E   E N G I N E E R`.
 *
 * Greenhouse names it as a parse failure, and it is the worst kind, because it
 * looks correct to the person who wrote it and parses as nothing. The parser
 * cannot join the characters back into words, so a heading written this way
 * contributes no searchable terms at all.
 *
 * Two ways in: literal typed spaces, and a PDF character-spacing operator wide
 * enough that the extractor emits each glyph as its own token. Both arrive here
 * as the same thing, because we work on extracted text rather than on the
 * source, so one detector covers both.
 *
 * Counting single-character tokens in aggregate does not work. It fires on "I"
 * and "a", on bullet characters, and on initials like `J. R. R. Tolkien`. Runs
 * are the signal: no English sentence has four single-letter words in a row.
 */

/** Shortest run that is evidence rather than coincidence. */
export const MIN_RUN = 4;

/** Share of tokens inside a qualifying run, and what that costs. */
export const SPACING_TIERS = [
  { over: 0.2, cost: 45, label: "Letter-spaced text" },
  { over: 0.05, cost: 25, label: "Letter-spaced text" },
  { over: 0, cost: 12, label: "Letter-spaced headings" },
] as const;

export type SpacingReport = {
  /** Tokens inside runs of MIN_RUN or longer, over all tokens. */
  share: number;
  /** Longest run found, in tokens. Zero when nothing qualified. */
  longest: number;
  /** The first offending run, reassembled, for the finding copy. */
  sample: string | null;
};

/**
 * A token that counts toward a run: exactly one letter.
 *
 * Digits are excluded because `1 2 3` is a date or a list, and punctuation is
 * excluded because an initial is `J.`, two characters, which already fails the
 * single-character test. That is what keeps `J. R. R. Tolkien` quiet.
 */
function isSingleLetter(token: string): boolean {
  return token.length === 1 && /\p{L}/u.test(token);
}

export function detectLetterSpacing(text: string): SpacingReport {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { share: 0, longest: 0, sample: null };

  let affected = 0;
  let longest = 0;
  let sample: string | null = null;

  let run = 0;
  const closeRun = (endsAt: number) => {
    if (run >= MIN_RUN) {
      affected += run;
      if (run > longest) longest = run;
      if (sample === null) {
        sample = tokens.slice(endsAt - run, endsAt).join(" ");
      }
    }
    run = 0;
  };

  tokens.forEach((token, i) => {
    if (isSingleLetter(token)) {
      run += 1;
      return;
    }
    closeRun(i);
  });
  closeRun(tokens.length);

  return { share: affected / tokens.length, longest, sample };
}
