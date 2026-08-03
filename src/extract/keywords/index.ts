/**
 * Posting-to-resume keyword matching.
 *
 * Three parts, in the order the text moves through them:
 *   words   - tokenising, stemming, and what counts as a word at all
 *   segment - the posting's own structure: required, wishlist, and noise
 *   report  - counting, ranking and what is worth putting on screen
 */

export {
  MAX_TERMS,
  MIN_POSTING_TERMS,
  STUFFING,
  matchKeywords,
  type KeywordReport,
} from "./report";

export { STOPWORD_COUNT } from "./words";
