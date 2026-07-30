import type { Block, Extraction, Flag } from "./types";
import { joinBlocks } from "./types";
import { local, scan } from "./xml";
import { openZip, readEntry } from "./zip";

/**
 * OpenDocument text (.odt). LibreOffice, OpenOffice, and what Google Docs
 * hands back if you ask for ODF.
 *
 * Same machinery as .docx with different element names: a zip, one XML part,
 * paragraphs and tables. It is here because it costs almost nothing once the
 * Word reader exists, and because people who write their resume in
 * LibreOffice have no idea it is an unusual choice.
 *
 * ODF is friendlier than OOXML in one respect that matters here: a paragraph
 * is <text:p>, a heading is <text:h>, and the distinction is structural rather
 * than a style id that a template is free to rename.
 */
export function extractOdt(bytes: Uint8Array): Extraction {
  const zip = openZip(bytes);
  const content = readEntry(zip, "content.xml");
  if (content === null) {
    throw new Error(
      "That .odt has no content part. It may have been renamed from another format.",
    );
  }

  const blocks: Block[] = [];
  const flags: Flag[] = [];

  let tableDepth = 0;
  let rowIndex = 0;
  let colIndex = 0;
  let tableCount = 0;
  let frameDepth = 0;
  let frameCount = 0;

  let buf: string | null = null;
  let heading = false;

  const flush = () => {
    if (buf === null) return;
    const text = buf.replace(/\s+/g, " ").trim();
    const wasHeading = heading;
    buf = null;
    heading = false;
    if (!text) return;

    const kind: Block["kind"] = frameDepth
      ? "textbox"
      : tableDepth
        ? "cell"
        : wasHeading
          ? "heading"
          : "paragraph";

    const block: Block = { kind, text };
    if (tableDepth && !frameDepth) {
      block.row = rowIndex;
      block.col = colIndex;
    }
    blocks.push(block);
  };

  for (const ev of scan(content)) {
    if (ev.type === "text") {
      if (buf !== null) buf += ev.text;
      continue;
    }

    const name = local(ev.name);

    if (ev.type === "open") {
      switch (name) {
        case "p":
          flush();
          buf = "";
          break;
        case "h":
          flush();
          buf = "";
          heading = true;
          break;
        case "table":
          flush();
          tableDepth += 1;
          if (tableDepth === 1) {
            tableCount += 1;
            rowIndex = -1;
          }
          break;
        case "table-row":
          rowIndex += 1;
          colIndex = -1;
          break;
        case "table-cell":
          colIndex += 1;
          break;
        // A frame is ODF's text box: a floating box anchored to the page.
        case "frame":
          flush();
          frameDepth += 1;
          if (frameDepth === 1) frameCount += 1;
          break;
        case "tab":
        case "s":
          if (buf !== null) buf += " ";
          break;
        case "line-break":
          if (buf !== null) buf += "\n";
          break;
        default:
          break;
      }
      continue;
    }

    switch (name) {
      case "p":
      case "h":
        flush();
        break;
      case "table":
        tableDepth = Math.max(0, tableDepth - 1);
        break;
      case "frame":
        flush();
        frameDepth = Math.max(0, frameDepth - 1);
        break;
      default:
        break;
    }
  }
  flush();

  if (tableCount) {
    flags.push({
      kind: "table",
      detail: `${
        tableCount === 1 ? "One table holds" : `${tableCount} tables hold`
      } part of the content. Some parsers read a table column by column, which detaches each date from the job it belongs to.`,
    });
  }
  if (frameCount) {
    flags.push({
      kind: "textbox",
      detail:
        "Text sits inside a floating frame. Frames are anchored outside the main flow, so a parser reading the body alone will not see them.",
    });
  }

  const text = joinBlocks(blocks);
  if (!text) {
    flags.push({
      kind: "emptyText",
      detail: "No text came out of this document at all.",
    });
  }

  return { depth: "layout", blocks, text, flags };
}
