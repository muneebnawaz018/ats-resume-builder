import type { ResumeFormat } from "@/lib/formats";
import type { Extraction } from "./types";

export type { Extraction } from "./types";
export { recoverFields } from "./fields";
export { matchKeywords, type KeywordReport } from "./keywords";
export { CEILING, scoreExtraction, type Score } from "./score";

/**
 * Reads a file with whichever extractor its format calls for.
 *
 * Every reader is imported on demand rather than at the top of the file.
 * Importing them statically put the zip inflater on the landing page and the
 * terms page, neither of which will ever open a document, the checker is one
 * route out of five, and the cost belongs to the moment somebody picks a file.
 *
 * Nothing is re-exported here for the same reason: a barrel naming the readers
 * would pull all of them into the first bundle that touches any one. Tests
 * import each module directly.
 *
 * Everything runs in the tab. Nothing here opens a network connection; the
 * only fetch involved is the pdf.js worker, and only for a PDF.
 */
export async function extract(
  file: File,
  format: ResumeFormat,
): Promise<Extraction> {
  switch (format.ext) {
    case ".pdf": {
      const { extractPdf } = await import("./pdf");
      return extractPdf(new Uint8Array(await file.arrayBuffer()));
    }
    case ".docx": {
      const { extractDocx } = await import("./docx");
      return extractDocx(new Uint8Array(await file.arrayBuffer()));
    }
    case ".odt": {
      const { extractOdt } = await import("./odt");
      return extractOdt(new Uint8Array(await file.arrayBuffer()));
    }
    case ".rtf": {
      const { extractRtf } = await import("./rtf");
      return extractRtf(await file.text());
    }
    case ".txt":
    case ".md": {
      const { extractText } = await import("./text");
      return extractText(await file.text(), format.ext === ".md");
    }
    default: {
      // The registry and this switch have to agree. If a format is added to
      // one and not the other, fail loudly rather than returning nothing.
      throw new Error(`No reader for ${format.ext}.`);
    }
  }
}
