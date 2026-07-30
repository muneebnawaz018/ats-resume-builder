import type { Block, Extraction, Flag } from "./types";
import { joinBlocks } from "./types";

/**
 * Rich Text Format.
 *
 * RTF is a stream of control words rather than a document tree, so this reads
 * it the way the format is actually written: walk the characters, keep a stack
 * of groups, and treat a handful of control words as text-producing. Nobody
 * needs a full RTF implementation to recover a resume, the specification is
 * three hundred pages, of which about fifteen control words matter here.
 *
 * Depth is "markup": rows and cells are recoverable, page geometry is not.
 */

/**
 * The Windows-1252 characters that differ from Latin-1. An em dash written by
 * Word arrives as \'97, and without this it comes out as a control character
 * in the middle of a job title.
 */
const CP1252: Record<number, string> = {
  0x80: "€",
  0x82: "‚",
  0x83: "ƒ",
  0x84: "„",
  0x85: "…",
  0x86: "†",
  0x87: "‡",
  0x88: "ˆ",
  0x89: "‰",
  0x8a: "Š",
  0x8b: "‹",
  0x8c: "Œ",
  0x8e: "Ž",
  0x91: "'",
  0x92: "'",
  0x93: "“",
  0x94: "”",
  0x95: "•",
  0x96: "–",
  0x97: "—",
  0x98: "˜",
  0x99: "™",
  0x9a: "š",
  0x9b: "›",
  0x9c: "œ",
  0x9e: "ž",
  0x9f: "Ÿ",
};

/**
 * Groups whose contents are metadata, not document text. Font and colour
 * tables in particular are long, and their contents read as plausible words.
 */
const NON_TEXT = new Set([
  "fonttbl",
  "colortbl",
  "stylesheet",
  "listtable",
  "listoverridetable",
  "info",
  "pict",
  "object",
  "themedata",
  "colorschememapping",
  "latentstyles",
  "datastore",
  "filetbl",
  "generator",
  "xmlnstbl",
  "rsidtbl",
]);

type State = { skip: boolean; unicodeSkip: number };

export function extractRtf(source: string): Extraction {
  const blocks: Block[] = [];
  const flags: Flag[] = [];

  const stack: State[] = [{ skip: false, unicodeSkip: 1 }];
  let state = stack[0];

  let buf = "";
  let inRow = false;
  let rowIndex = -1;
  let colIndex = -1;
  let tableRows = 0;
  /** Characters to drop after a \\uN, which have already been emitted as it. */
  let pendingSkip = 0;

  const push = (s: string) => {
    if (state.skip) return;
    if (pendingSkip > 0) {
      pendingSkip -= 1;
      return;
    }
    buf += s;
  };

  const flush = (kind: Block["kind"] = "paragraph") => {
    const text = buf.replace(/[ \t]+/g, " ").trim();
    buf = "";
    if (!text) return;
    const block: Block = { kind, text };
    if (kind === "cell") {
      block.row = rowIndex;
      block.col = colIndex;
    }
    blocks.push(block);
  };

  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    if (ch === "{") {
      stack.push({ ...state });
      state = stack[stack.length - 1];
      i += 1;
      continue;
    }
    if (ch === "}") {
      flushGroupText();
      stack.pop();
      state = stack[stack.length - 1] ?? { skip: false, unicodeSkip: 1 };
      i += 1;
      continue;
    }
    if (ch !== "\\") {
      if (ch !== "\r" && ch !== "\n") push(ch);
      i += 1;
      continue;
    }

    // From here on: a control sequence.
    const next = source[i + 1];

    if (next === "\\" || next === "{" || next === "}") {
      push(next);
      i += 2;
      continue;
    }
    if (next === "'") {
      const hex = source.slice(i + 2, i + 4);
      const code = parseInt(hex, 16);
      if (Number.isFinite(code)) {
        push(CP1252[code] ?? String.fromCharCode(code));
      }
      i += 4;
      continue;
    }
    if (next === "*") {
      // \\*\\destination, an extension the reader is told it may ignore.
      state.skip = true;
      i += 2;
      continue;
    }
    if (next === "\n" || next === "\r") {
      push("\n");
      i += 2;
      continue;
    }

    const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(source.slice(i));
    if (!m) {
      i += 1;
      continue;
    }
    const word = m[1];
    const param = m[2] === undefined ? undefined : parseInt(m[2], 10);
    i += m[0].length;

    if (NON_TEXT.has(word)) {
      state.skip = true;
      continue;
    }

    switch (word) {
      case "par":
      case "line":
      case "sect":
        flush(inRow ? "cell" : "paragraph");
        break;
      case "tab":
        push(" ");
        break;
      case "cell":
        colIndex += 1;
        flush("cell");
        break;
      case "trowd":
        if (!inRow) {
          inRow = true;
          rowIndex += 1;
          colIndex = -1;
        }
        break;
      case "row":
        flush("cell");
        tableRows += 1;
        inRow = false;
        break;
      case "uc":
        state.unicodeSkip = param ?? 1;
        break;
      case "u": {
        if (param !== undefined) {
          // Negative values are the signed 16-bit form of a high code point.
          const code = param < 0 ? param + 65536 : param;
          push(String.fromCharCode(code));
          pendingSkip = state.unicodeSkip;
        }
        break;
      }
      case "bullet":
        push("• ");
        break;
      case "emdash":
        push("—");
        break;
      case "endash":
        push("–");
        break;
      default:
        break;
    }
  }
  flush(inRow ? "cell" : "paragraph");

  if (tableRows) {
    flags.push({
      kind: "table",
      detail: `Content sits in a table of ${tableRows} row${
        tableRows === 1 ? "" : "s"
      }. Some parsers read a table column by column, which detaches each date from the job it belongs to.`,
    });
  }

  const text = joinBlocks(blocks);
  if (!text) {
    flags.push({
      kind: "emptyText",
      detail: "No text came out of this document at all.",
    });
  }

  return { depth: "markup", blocks, text, flags };

  /*
   * A group closing does not end a paragraph, but it does end a run of text
   * that belonged to a skipped destination. Flushing here keeps a font table
   * that opened before the skip took effect from bleeding into the next line.
   */
  function flushGroupText() {
    if (state.skip) buf = "";
  }
}
