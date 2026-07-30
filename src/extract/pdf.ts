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

      for (const line of reading) {
        const text = lineText(line);
        if (!text) continue;
        charCount += text.length;

        // Fifteen per cent over the body size. A section heading on a resume
        // is often only a point or two larger than the text under it, so a
        // wider margin than this misses most of them.
        const tallest = Math.max(...line.items.map((i) => i.height));
        blocks.push({
          kind: tallest >= median * 1.15 ? "heading" : "paragraph",
          text: text.replace(/\t/g, "  "),
          page: n,
          x: Math.round(line.items[0].transform[4]),
          y: Math.round(line.y),
        });
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
