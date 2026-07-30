import type { Block, Extraction, Flag } from "./types";
import { joinBlocks } from "./types";

/**
 * PDF.
 *
 * The only format that carries page geometry, which is what makes the two
 * checks that matter most possible: whether there is a text layer at all, and
 * whether the text comes out in the order a person reads it.
 *
 * pdf.js is loaded on demand. It is by far the largest thing in the app, and
 * nobody who never opens a PDF should pay for it, the import sits inside the
 * function for that reason, not at the top of the file.
 */

/** Only the parts of pdf.js this file touches. */
type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

type Pdfjs = {
  getDocument(src: { data: Uint8Array; isEvalSupported?: boolean }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getTextContent(): Promise<{ items: unknown[] }>;
      }>;
    }>;
    /** Frees the worker. Lives on the loading task, not on the document. */
    destroy(): Promise<void>;
  };
  GlobalWorkerOptions: { workerSrc: string };
};

/**
 * The worker is copied into public/ at build time rather than resolved from
 * node_modules, because this app is a static export: there is no server to
 * hand out a hashed chunk, and a bare specifier would not resolve in the
 * browser.
 */
export const WORKER_PATH = "/pdf.worker.min.mjs";

async function loadBrowserPdfjs(): Promise<Pdfjs> {
  const mod = (await import("pdfjs-dist")) as unknown as Pdfjs;
  mod.GlobalWorkerOptions.workerSrc = WORKER_PATH;
  return mod;
}

/** Two points. Anything closer is the same line with a different font. */
const LINE_TOLERANCE = 2;

/**
 * Points of clear horizontal space that make two runs of text separate
 * columns rather than a wide gap. Roughly half an inch, a tab stop inside a
 * line is smaller, and a real column gutter is larger.
 */
const COLUMN_GAP = 36;

type Line = {
  y: number;
  items: TextItem[];
  /** Emission index of the first item, for the reading-order comparison. */
  first: number;
};

function isTextItem(v: unknown): v is TextItem {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as TextItem).str === "string" &&
    Array.isArray((v as TextItem).transform)
  );
}

/** Groups items into lines by their baseline, in the order they were drawn. */
function toLines(items: TextItem[]): Line[] {
  const lines: Line[] = [];
  items.forEach((item, index) => {
    const y = item.transform[5];
    const line = lines.find((l) => Math.abs(l.y - y) <= LINE_TOLERANCE);
    if (line) line.items.push(item);
    else lines.push({ y, items: [item], first: index });
  });
  for (const line of lines) line.items.sort((a, b) => a.transform[4] - b.transform[4]);
  return lines;
}

function lineText(line: Line): string {
  let out = "";
  let prevEnd: number | null = null;
  for (const item of line.items) {
    const x = item.transform[4];
    // A gap this wide is a gutter, not a space. Marking it keeps two columns
    // from being glued into one nonsense sentence.
    if (prevEnd !== null && x - prevEnd > COLUMN_GAP) out += "\t";
    else if (prevEnd !== null && x - prevEnd > 1 && !out.endsWith(" ")) out += " ";
    out += item.str;
    prevEnd = x + item.width;
  }
  return out.replace(/[ ]+/g, " ").trim();
}

/**
 * A PDF has no idea what a paragraph is. It stores glyphs at coordinates, so
 * a sentence that wrapped over three visual lines arrives as three unrelated
 * runs of text, and treating each as its own block turns one bullet into
 * three fragments: "...split tabs, ordering, loyalty," / "memberships,
 * ticketing, plus an App Clip." Real applicant tracking systems rejoin these,
 * and so must we, or the document we hand to the editor is shredded.
 *
 * Only the geometry can tell us. The signal that carries the most weight is
 * whether the previous line reached the right-hand measure: text that wrapped
 * had no choice but to fill the line, and text that ended deliberately stops
 * short of it.
 */
export type LineGeom = {
  text: string;
  left: number;
  right: number;
  /** Baseline. Larger is higher up the page. */
  y: number;
  kind: "heading" | "paragraph";
};

/**
 * How far short of the measure a line may stop and still count as full,
 * expressed in body-text heights.
 *
 * Wrapped text does not end flush. It ends wherever the next word would not
 * fit, so the ragged edge is up to one word wide, and a word is around four
 * to five em. Measured against a real wrapped bullet: 47 points of gap at
 * 11 point text, which a fixed 14 point tolerance rejected outright.
 *
 * Lines that end on purpose in a resume stop far shorter than this. A job
 * title, a date, the last line of a paragraph: all leave a third of the
 * measure or more.
 */
const WRAP_SLACK_EM = 4.5;

/** Floor, for documents whose glyph heights come back too small to trust. */
const WRAP_SLACK_MIN = 14;

/** Baseline gap, as a multiple of body text height, that is still one paragraph. */
const LEADING = 1.9;

/** A continuation may sit at the paragraph's left edge or its hanging indent. */
const INDENT_MIN = -3;
const INDENT_MAX = 30;

/**
 * How many lines must reach the right-hand edge before we believe in it.
 *
 * The measure is taken from the widest line on the page, which is only
 * meaningful if several lines agree on it. On a sparse page the widest line
 * is just the longest job title, and treating that as the measure makes every
 * title look like it ran out of room, so the line under it gets swallowed.
 *
 * Text that genuinely wraps produces a run of lines all ending within a word
 * of each other. Fewer than three and there is no evidence of a measure, so
 * nothing is joined: leaving lines separate is the safe failure.
 */
const MEASURE_SUPPORT = 3;

/** Bullet glyphs and list numbering, which always begin something new. */
const STARTS_ITEM = /^\s*(?:[•·▪◦‣∙*–—-]|\(?\d{1,2}[.)]|[a-z][.)])\s/i;

/** Whether `next` is the continuation of a line that ran out of room. */
export function wraps(
  prev: LineGeom,
  next: LineGeom,
  /** Right edge of the widest line on the page: the measure text was set to. */
  measure: number,
  /** Median glyph height, standing in for the body text size. */
  body: number,
): boolean {
  if (prev.kind !== "paragraph" || next.kind !== "paragraph") return false;

  // The previous line stopped short of the measure, so it ended on purpose.
  const slack = Math.max(WRAP_SLACK_MIN, body * WRAP_SLACK_EM);
  if (prev.right < measure - slack) return false;

  /*
   * A tab marks a gap wide enough to be a gutter. A line holding one is a
   * role beside its dates, or two columns, not running prose: its right edge
   * belongs to the far column and says nothing about wrapping.
   */
  if (prev.text.includes("\t") || next.text.includes("\t")) return false;

  // A bullet or a number begins a new item whatever the geometry says.
  if (STARTS_ITEM.test(next.text)) return false;

  /*
   * A finished sentence followed by a capital is a new bullet, not a wrap.
   *
   * Plenty of resumes set their bullets without a glyph, and then the only
   * thing separating two of them is the full stop. Splitting one paragraph at
   * a sentence boundary costs a little; gluing two bullets into one costs
   * more, because the editor then shows a single unmanageable blob.
   */
  if (/[.!?]["')\]]?$/.test(prev.text) && /^[A-Z(]/.test(next.text)) {
    return false;
  }

  // Baselines further apart than normal leading are a new paragraph.
  const gap = prev.y - next.y;
  if (gap <= 0 || gap > body * LEADING) return false;

  // A continuation lines up with its paragraph, or indents under the bullet.
  const indent = next.left - prev.left;
  return indent >= INDENT_MIN && indent <= INDENT_MAX;
}

export async function extractPdf(
  bytes: Uint8Array,
  load: () => Promise<Pdfjs> = loadBrowserPdfjs,
): Promise<Extraction> {
  const pdfjs = await load();

  const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false });
  let doc;
  try {
    doc = await task.promise;
  } catch {
    throw new Error(
      "That PDF could not be opened. It may be damaged, or password protected.",
    );
  }

  const blocks: Block[] = [];
  const flags: Flag[] = [];
  const emptyPages: number[] = [];
  let charCount = 0;
  let orderDiffers = false;

  try {
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items = content.items.filter(isTextItem).filter((i) => i.str.trim());

      if (!items.length) {
        emptyPages.push(n);
        continue;
      }

      const lines = toLines(items);
      // Top of the page first. PDF measures y upward from the bottom edge.
      const reading = [...lines].sort((a, b) => b.y - a.y);

      /*
       * The check that earns this whole module: compare the order the text was
       * drawn in against the order a person reads it. A layout engine emits a
       * two-column page row by row, so a parser that trusts emission order
       * produces "Email  Senior Backend Engineer" on every line.
       */
      if (!orderDiffers) {
        const emitted = [...lines].sort((a, b) => a.first - b.first);
        orderDiffers = reading.some((line, i) => line !== emitted[i]);
      }

      const heights = items.map((i) => i.height).sort((a, b) => a - b);
      const median = heights[Math.floor(heights.length / 2)] || 0;

      const geom = (line: Line): LineGeom => {
        const last = line.items[line.items.length - 1];
        // Fifteen per cent over the body size. A section heading on a resume
        // is often only a point or two larger than the text under it, so a
        // wider margin than this misses most of them.
        const tallest = Math.max(...line.items.map((i) => i.height));
        return {
          text: lineText(line),
          left: line.items[0].transform[4],
          right: last.transform[4] + last.width,
          y: line.y,
          kind: tallest >= median * 1.15 ? "heading" : "paragraph",
        };
      };

      /*
       * The measure the page was set to. Taken from the widest line rather
       * than the page width, because margins vary and what matters is where
       * this document's text actually stops.
       */
      const measured = reading.filter((l) => lineText(l));
      const rights = measured.map((l) => geom(l).right);
      const measure = Math.max(0, ...rights);

      /*
       * Only rejoin when the page shows a right-hand edge several lines
       * agree on. Without that there is no measure to have run out of, and
       * any join would be a guess.
       */
      const slack = Math.max(WRAP_SLACK_MIN, median * WRAP_SLACK_EM);
      const rejoin =
        rights.filter((r) => r >= measure - slack).length >= MEASURE_SUPPORT;

      let open: Block | null = null;
      let openGeom: LineGeom | null = null;

      for (const line of measured) {
        const g = geom(line);
        charCount += g.text.length;

        // A wrapped line belongs to the block above it, not to one of its own.
        if (rejoin && open && openGeom && wraps(openGeom, g, measure, median)) {
          open.text += ` ${g.text.replace(/\t/g, "  ")}`;
          openGeom = g;
          continue;
        }

        open = {
          kind: g.kind,
          text: g.text.replace(/\t/g, "  "),
          page: n,
          x: Math.round(g.left),
          y: Math.round(g.y),
        };
        openGeom = g;
        blocks.push(open);
      }

      // A gutter that appears on most lines is a column layout, not one wide
      // gap in a single line of contact details.
      const gutters = reading.filter((l) => lineText(l).includes("\t")).length;
      if (gutters >= 3 && gutters >= reading.length * 0.4) {
        flags.push({
          kind: "multiColumn",
          page: n,
          detail: `Page ${n} is laid out in two columns. Most parsers flatten a page to a single stream, which interleaves the two.`,
        });
      }
    }
  } finally {
    await task.destroy();
  }

  const pages = doc.numPages;
  const hasTextLayer = charCount > 0;

  if (!hasTextLayer) {
    flags.push({
      kind: "noTextLayer",
      detail:
        "This PDF contains no text, only an image of one. Every applicant tracking system scores it zero, because there is nothing to read. Export from the original document rather than scanning or screenshotting it.",
    });
  } else if (emptyPages.length) {
    flags.push({
      kind: "noTextLayer",
      page: emptyPages[0],
      detail: `${
        emptyPages.length === 1
          ? `Page ${emptyPages[0]} has`
          : `Pages ${emptyPages.join(", ")} have`
      } no text on ${emptyPages.length === 1 ? "it" : "them"}: an image, or a blank page.`,
    });
  }

  if (orderDiffers) {
    flags.push({
      kind: "readingOrder",
      detail:
        "The text is not stored in the order it appears on the page. A parser reading it in file order gets the lines shuffled.",
    });
  }

  return {
    depth: "layout",
    blocks,
    text: joinBlocks(blocks),
    flags,
    pages,
    hasTextLayer,
  };
}
