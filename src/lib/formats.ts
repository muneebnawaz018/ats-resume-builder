/**
 * What the checker will read, and what it can honestly say about each.
 *
 * The list is what a hiring system might plausibly be handed. HTML is absent
 * on purpose: a web page is not a submission format, so reading one would only
 * produce a clean report for a file nobody can submit. See EXPORT_FORMATS for
 * the other half of the rule, what we are willing to write.
 *
 * Selection is by extension, not MIME type. Browsers disagree: Chrome sends
 * the long OOXML type for .docx, Windows often sends application/octet-stream,
 * and a file dragged out of a mail client can arrive with an empty type. The
 * extension is the part the user controls.
 */

/**
 * How much of a document survives into the file, which sets what a report can
 * legitimately claim.
 *
 *   layout, geometry and structure are in the file: columns, tables, text
 *            boxes, headers. Every check applies.
 *   markup, structure without geometry. Tables and headings are visible,
 *            reading order and column damage are not.
 *   text, words only. Field recovery, headings and dates still mean
 *            something; nothing about layout does.
 *
 * A .txt cannot fail a layout-table check, so the report marks those checks
 * not applicable rather than passing them. A clean score the format could
 * never have failed is a lie by omission.
 */
export type FormatDepth = "layout" | "markup" | "text";

export type ResumeFormat = {
  ext: string;
  label: string;
  depth: FormatDepth;
  /** Types worth naming in the accept attribute. Never trusted for checks. */
  mimes: readonly string[];
};

export const READ_FORMATS: readonly ResumeFormat[] = [
  { ext: ".pdf", label: "PDF", depth: "layout", mimes: ["application/pdf"] },
  {
    ext: ".docx",
    label: "Word",
    depth: "layout",
    mimes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  {
    ext: ".odt",
    label: "OpenDocument",
    depth: "layout",
    mimes: ["application/vnd.oasis.opendocument.text"],
  },
  { ext: ".rtf", label: "Rich text", depth: "markup", mimes: ["application/rtf"] },
  { ext: ".txt", label: "Plain text", depth: "text", mimes: ["text/plain"] },
  { ext: ".md", label: "Markdown", depth: "text", mimes: [] },
] as const;

/**
 * Formats we will not read, each with the specific way out.
 *
 * .doc is a Word 97 binary, a compound file with a piece table, not markup,
 * and a parser for it is a project of its own. .pages is a bundle of encoded
 * protobuf; no applicant tracking system accepts it either, so converting is
 * the right advice regardless of what we could manage to read.
 */
export const REJECTED: Readonly<Record<string, string>> = {
  ".doc": "Word 97 format. Open it in Word and use Save As → .docx.",
  ".html": "A web page is not a submission format. Print it to PDF.",
  ".htm": "A web page is not a submission format. Print it to PDF.",
  ".pages": "No hiring system accepts Pages. Use File → Export To → PDF.",
  ".key": "That is a Keynote deck.",
  ".pptx": "That is a slide deck, not a document.",
  ".xlsx": "That is a spreadsheet.",
  ".jpg": "An image has no text to read. Export the document itself as a PDF.",
  ".jpeg": "An image has no text to read. Export the document itself as a PDF.",
  ".png": "An image has no text to read. Export the document itself as a PDF.",
};

/**
 * Ten megabytes. A text resume is well under one; anything past this is
 * scanned pages, which have no text layer to read in the first place.
 */
export const MAX_BYTES = 10 * 1024 * 1024;

/** The `accept` attribute, built from the registry so the two cannot drift. */
export const ACCEPT_ATTR = [
  ...READ_FORMATS.map((f) => f.ext),
  ...new Set(READ_FORMATS.flatMap((f) => f.mimes)),
].join(",");

/** Lowercased extension including the dot, or "" when there is none. */
export function extname(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type Classified =
  | { ok: true; format: ResumeFormat }
  | { ok: false; reason: string };

/** Whether we can read this file, and if not, what the person should do. */
export function classify(file: File): Classified {
  const ext = extname(file.name);
  const format = READ_FORMATS.find((f) => f.ext === ext);

  if (!format) {
    const fix = REJECTED[ext];
    return {
      ok: false,
      reason: fix
        ? `${ext} cannot be read here. ${fix}`
        : `${ext || "That file"} is not a document format. Try PDF or Word.`,
    };
  }
  if (file.size === 0) return { ok: false, reason: "That file is empty." };
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      reason: `That file is ${formatBytes(file.size)}. The limit is 10 MB.`,
    };
  }
  return { ok: true, format };
}

/** One line under the picker saying how deep the report will go. */
export function depthNote(depth: FormatDepth): string {
  switch (depth) {
    case "layout":
      return "Full report: reading order, structure, fields and dates.";
    case "markup":
      return "This format carries no page geometry, so column and reading-order checks are skipped.";
    case "text":
      return "Plain text has no layout to lose. Fields, headings and dates are still checked.";
  }
}
