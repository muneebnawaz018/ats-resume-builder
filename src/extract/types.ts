import type { FormatDepth } from "@/lib/formats";

/**
 * What every extractor produces, whatever it read.
 *
 * The shape is deliberately flat. A resume is not a tree anyone benefits from
 * walking, the checks want an ordered list of text with enough provenance on
 * each item to say where a problem is, and the geometry only some formats can
 * supply is optional rather than faked.
 */

/** Where a piece of text sat in the source document. */
export type BlockKind =
  | "heading"
  | "paragraph"
  | "listItem"
  | "cell"
  | "textbox"
  | "header"
  | "footer";

export type Block = {
  kind: BlockKind;
  text: string;
  /** 1-based, PDF only. */
  page?: number;
  /** Points from the left edge and up from the bottom. PDF only. */
  x?: number;
  y?: number;
  /** Position in the table this cell came from, for naming the problem. */
  row?: number;
  col?: number;
};

/**
 * Something about the document that puts extraction at risk.
 *
 * A flag is not a failure. Plenty of resumes with a table parse perfectly;
 * the point is that the risk is present and locatable, so the report can name
 * the place rather than quote a rule.
 */
export type FlagKind =
  | "table"
  | "textbox"
  | "headerContent"
  | "footerContent"
  | "multiColumn"
  | "readingOrder"
  | "noTextLayer"
  | "emptyText";

export type Flag = {
  kind: FlagKind;
  /** One sentence naming the specific place. Shown to the user as written. */
  detail: string;
  page?: number;
};

export type Extraction = {
  /** How much the source format could carry, sets what a report may claim. */
  depth: FormatDepth;
  blocks: Block[];
  /** Blocks joined in the order a parser would read them. */
  text: string;
  flags: Flag[];
  /** PDF only. */
  pages?: number;
  /**
   * False when a PDF holds no extractable text at all. Every applicant
   * tracking system scores that zero, so it outranks every other finding.
   */
  hasTextLayer?: boolean;
};

/** Joins blocks the way a downstream parser would see them. */
export function joinBlocks(blocks: Block[]): string {
  return blocks
    .map((b) => b.text.trim())
    .filter(Boolean)
    .join("\n");
}
