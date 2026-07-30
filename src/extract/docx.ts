import type { Block, Extraction, Flag } from "./types";
import { joinBlocks } from "./types";
import { local, scan } from "./xml";
import { openZip, readEntry, readMatching } from "./zip";

/**
 * Word (.docx).
 *
 * The unit of text is <w:t>, and a single word is routinely split across
 * several of them. Word starts a new run at every formatting change, and a
 * spell-check correction alone is enough to fragment a word mid-syllable. Runs
 * are joined without a separator for that reason; the paragraph is the only
 * boundary that means anything.
 *
 * The three structures worth finding are tables, text boxes and page headers,
 * because each is a place a parser can silently skip.
 */

/** Word's own heading style ids, plus the ones templates invent. */
function isHeadingStyle(style: string | undefined): boolean {
  if (!style) return false;
  const s = style.toLowerCase();
  return s === "title" || s === "subtitle" || /^heading\d?$/.test(s);
}

/** Every <w:t> in a part, flattened. Used for headers and footers. */
function plainText(part: string): string {
  let out = "";
  let inT = false;
  for (const ev of scan(part)) {
    if (ev.type === "open" && local(ev.name) === "t") inT = true;
    else if (ev.type === "close" && local(ev.name) === "t") inT = false;
    else if (ev.type === "text" && inT) out += ev.text;
    else if (ev.type === "close" && local(ev.name) === "p" && out) out += " ";
  }
  return out.replace(/\s+/g, " ").trim();
}

export function extractDocx(bytes: Uint8Array): Extraction {
  const zip = openZip(bytes);
  const document = readEntry(zip, "word/document.xml");
  if (document === null) {
    throw new Error(
      "That .docx has no document part. It may have been renamed from another format.",
    );
  }

  const blocks: Block[] = [];
  const flags: Flag[] = [];

  let tableDepth = 0;
  let rowIndex = 0;
  let colIndex = 0;
  let tableCount = 0;
  let textboxDepth = 0;
  let textboxCount = 0;

  /** Open paragraph, flushed at </w:p>. */
  let buf: string | null = null;
  let style: string | undefined;
  let inT = false;

  const flush = () => {
    if (buf === null) return;
    const text = buf.replace(/[ \t]+/g, " ").trim();
    const paraStyle = style;
    buf = null;
    style = undefined;
    if (!text) return;

    const kind: Block["kind"] = textboxDepth
      ? "textbox"
      : tableDepth
        ? "cell"
        : isHeadingStyle(paraStyle)
          ? "heading"
          : paraStyle?.toLowerCase() === "listparagraph"
            ? "listItem"
            : "paragraph";

    const block: Block = { kind, text };
    if (tableDepth && !textboxDepth) {
      block.row = rowIndex;
      block.col = colIndex;
    }
    blocks.push(block);
  };

  for (const ev of scan(document)) {
    if (ev.type === "text") {
      if (inT && buf !== null) buf += ev.text;
      continue;
    }

    const name = local(ev.name);

    if (ev.type === "open") {
      switch (name) {
        case "t":
          if (!ev.self) inT = true;
          break;
        case "p":
          flush();
          buf = "";
          break;
        case "pstyle":
          style = ev.attrs["w:val"] ?? ev.attrs["val"];
          break;
        case "numpr":
          // A bulleted paragraph. Some templates carry no style at all.
          if (!style) style = "ListParagraph";
          break;
        case "tbl":
          flush();
          tableDepth += 1;
          if (tableDepth === 1) {
            tableCount += 1;
            rowIndex = -1;
          }
          break;
        case "tr":
          rowIndex += 1;
          colIndex = -1;
          break;
        case "tc":
          colIndex += 1;
          break;
        case "txbxcontent":
          flush();
          textboxDepth += 1;
          if (textboxDepth === 1) textboxCount += 1;
          break;
        case "tab":
          if (buf !== null) buf += " ";
          break;
        case "br":
        case "cr":
          if (buf !== null) buf += "\n";
          break;
        default:
          break;
      }
      continue;
    }

    switch (name) {
      case "t":
        inT = false;
        break;
      case "p":
        flush();
        break;
      case "tbl":
        tableDepth = Math.max(0, tableDepth - 1);
        break;
      case "txbxcontent":
        flush();
        textboxDepth = Math.max(0, textboxDepth - 1);
        break;
      default:
        break;
    }
  }
  flush();

  /*
   * Headers and footers are separate parts. A resume with contact details up
   * there is one of the most common ways an email address vanishes: plenty of
   * extractors read word/document.xml and nothing else.
   */
  for (const part of readMatching(zip, /^word\/header\d*\.xml$/i)) {
    const text = plainText(part);
    if (text) blocks.push({ kind: "header", text });
  }
  for (const part of readMatching(zip, /^word\/footer\d*\.xml$/i)) {
    const text = plainText(part);
    if (text) blocks.push({ kind: "footer", text });
  }

  if (tableCount) {
    flags.push({
      kind: "table",
      detail: `${
        tableCount === 1 ? "One table holds" : `${tableCount} tables hold`
      } part of the content. Some parsers read a table column by column, which detaches each date from the job it belongs to.`,
    });
  }
  if (textboxCount) {
    flags.push({
      kind: "textbox",
      detail: `Text sits inside ${
        textboxCount === 1 ? "a text box" : `${textboxCount} text boxes`
      }. A text box is outside the main story, so a parser reading only the body will not see any of it.`,
    });
  }
  if (blocks.some((b) => b.kind === "header")) {
    flags.push({
      kind: "headerContent",
      detail:
        "Content sits in the page header. Extractors frequently read the body alone, so anything up there can be lost entirely.",
    });
  }
  if (blocks.some((b) => b.kind === "footer")) {
    flags.push({
      kind: "footerContent",
      detail: "Content sits in the page footer, which many extractors skip.",
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
