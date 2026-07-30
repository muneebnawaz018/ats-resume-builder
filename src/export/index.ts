import type { Resume } from "@/schema";

/**
 * Everything a resume can be saved as.
 *
 * PDF is missing from this list on purpose. It is produced by printing the
 * real document, which is what keeps its text layer selectable and its fonts
 * embedded, a PDF assembled from this model would be a second, worse
 * renderer. The caller triggers printing; see EditorShell.
 *
 * HTML is missing too, and that is a recommendation rather than an oversight:
 * no applicant tracking system takes one, and offering it would invite people
 * to submit a file that gets rejected at the upload step.
 *
 * Writers are imported on demand, the Word and OpenDocument writers pull the
 * zip encoder, and most people export once, at the end.
 */
export type ExportFormat = {
  ext: ".docx" | ".odt" | ".rtf" | ".txt" | ".md";
  label: string;
  /** Why someone would pick this one. Shown next to the label. */
  note: string;
  mime: string;
};

export const EXPORT_FORMATS: readonly ExportFormat[] = [
  {
    ext: ".docx",
    label: "Word",
    note: "Asked for by name on most application forms.",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  {
    ext: ".odt",
    label: "OpenDocument",
    note: "LibreOffice, and some European employers.",
    mime: "application/vnd.oasis.opendocument.text",
  },
  {
    ext: ".rtf",
    label: "Rich text",
    note: "Opens anywhere, including older portals.",
    mime: "application/rtf",
  },
  {
    ext: ".txt",
    label: "Plain text",
    note: "For the boxes that ask you to paste it in.",
    mime: "text/plain",
  },
  {
    ext: ".md",
    label: "Markdown",
    note: "For keeping it in version control.",
    mime: "text/markdown",
  },
] as const;

/** Builds the file. Nothing is written to disk and nothing leaves the tab. */
export async function toBlob(
  resume: Resume,
  format: ExportFormat,
): Promise<Blob> {
  switch (format.ext) {
    case ".docx": {
      const { toDocx } = await import("./docx");
      return new Blob([toDocx(resume) as BlobPart], { type: format.mime });
    }
    case ".odt": {
      const { toOdt } = await import("./odt");
      return new Blob([toOdt(resume) as BlobPart], { type: format.mime });
    }
    case ".rtf": {
      const { toRtf } = await import("./rtf");
      return new Blob([toRtf(resume)], { type: format.mime });
    }
    case ".txt": {
      const { toPlainText } = await import("./text");
      return new Blob([toPlainText(resume)], { type: `${format.mime};charset=utf-8` });
    }
    case ".md": {
      const { toMarkdown } = await import("./text");
      return new Blob([toMarkdown(resume)], { type: `${format.mime};charset=utf-8` });
    }
  }
}

/** Builds the file and hands it to the browser's downloader. */
export async function download(
  resume: Resume,
  format: ExportFormat,
): Promise<void> {
  const { stem } = await import("./model");
  const blob = await toBlob(resume, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${stem(resume)}${format.ext}`;
  a.click();
  // Revoking immediately cancels the download in Safari; one frame is enough.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
