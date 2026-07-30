import type { Resume } from "@/schema";
import { toLines } from "./model";

/**
 * Plain text and Markdown.
 *
 * The plain-text export is the honest floor of the whole product: if a resume
 * reads correctly here, no parser on earth can scramble it. It is also the
 * format some job boards still ask you to paste into a box.
 */
export function toPlainText(resume: Resume): string {
  const out: string[] = [];

  for (const line of toLines(resume)) {
    switch (line.kind) {
      case "name":
        out.push(line.text, "");
        break;
      case "heading":
        // A blank line above, none below: the heading belongs to what follows.
        out.push("", line.text.toUpperCase(), "");
        break;
      case "entryTitle":
        out.push(line.text);
        break;
      case "bullet":
        out.push(`- ${line.text}`);
        break;
      default:
        out.push(line.text);
        break;
    }
  }

  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export function toMarkdown(resume: Resume): string {
  const out: string[] = [];

  for (const line of toLines(resume)) {
    switch (line.kind) {
      case "name":
        out.push(`# ${line.text}`, "");
        break;
      case "headline":
        out.push(`**${line.text}**`, "");
        break;
      case "heading":
        out.push("", `## ${line.text}`, "");
        break;
      case "entryTitle":
        out.push(`### ${line.text}`);
        break;
      case "entryMeta":
        out.push(`*${line.text}*`, "");
        break;
      case "bullet":
        out.push(`- ${line.text}`);
        break;
      default:
        out.push(line.text, "");
        break;
    }
  }

  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
