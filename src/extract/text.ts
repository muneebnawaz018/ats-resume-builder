import type { Block, Extraction, Flag } from "./types";
import { joinBlocks } from "./types";

/**
 * Plain text and Markdown.
 *
 * Nothing here can be lost to layout, because there is no layout, which is
 * the point of accepting these at all. A plain-text resume is the control
 * case: if a field cannot be recovered from this, the problem is the wording,
 * not the file.
 *
 * Markdown gets one extra pass. Its tables are the one construct that behaves
 * like a document table, and history-in-a-table is common enough in files
 * exported from note-taking apps to be worth naming.
 */

const BULLET = /^\s*([-*+•·‣]|\d+[.)])\s+/;
const MD_HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;
const MD_TABLE_ROW = /^\s*\|(.+)\|\s*$/;
/** The |---|---| line under a Markdown table header. */
const MD_TABLE_RULE = /^[\s|:-]+$/;

/**
 * A line in a plain-text resume that is acting as a section heading.
 *
 * No markup to go on, so this uses what people actually do: a short line, in
 * caps or title case, with no sentence punctuation. Being wrong here is cheap,
 *the block is still extracted, it is only labelled differently.
 */
function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length > 40) return false;
  if (/[.,;:]$/.test(t)) return false;
  if (BULLET.test(t)) return false;
  const letters = t.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase();
}

export function extractText(source: string, markdown: boolean): Extraction {
  // A byte order mark survives real uploads and shows up glued to the name.
  const clean = source.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n");

  const blocks: Block[] = [];
  const flags: Flag[] = [];
  let tableRows = 0;
  let rowIndex = -1;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    if (markdown) {
      const heading = MD_HEADING.exec(line);
      if (heading) {
        blocks.push({ kind: "heading", text: heading[2] });
        continue;
      }

      const tableRow = MD_TABLE_ROW.exec(line);
      if (tableRow) {
        if (MD_TABLE_RULE.test(tableRow[1])) continue;
        rowIndex += 1;
        tableRows += 1;
        tableRow[1]
          .split("|")
          .map((c) => c.trim())
          .forEach((cell, col) => {
            if (cell) {
              blocks.push({ kind: "cell", text: strip(cell), row: rowIndex, col });
            }
          });
        continue;
      }
    }

    if (BULLET.test(line)) {
      blocks.push({ kind: "listItem", text: strip(line.replace(BULLET, "")) });
      continue;
    }
    if (looksLikeHeading(line)) {
      blocks.push({ kind: "heading", text: strip(line.trim()) });
      continue;
    }
    blocks.push({ kind: "paragraph", text: strip(line.trim()) });
  }

  if (tableRows) {
    flags.push({
      kind: "table",
      detail: `Employment history sits in a table of ${tableRows} rows. Converted to Word or PDF, that table becomes the most likely thing to scramble.`,
    });
  }

  const text = joinBlocks(blocks);
  if (!text) {
    flags.push({ kind: "emptyText", detail: "That file has no text in it." });
  }

  return { depth: "text", blocks, text, flags };

  /** Markdown emphasis and link syntax, removed from the recovered text. */
  function strip(s: string): string {
    if (!markdown) return s;
    return s
      .replace(/!?\[([^\]]*)\]\(([^)]*)\)/g, (_, label: string, href: string) =>
        // A bare link keeps its target: a portfolio URL is a recoverable
        // field, and dropping it would hide a real loss.
        label ? `${label} (${href})` : href,
      )
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim();
  }
}
