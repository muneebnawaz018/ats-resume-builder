import type { Resume } from "@/schema";
import { toLines } from "./model";

/**
 * Rich Text Format.
 *
 * Still accepted by Taleo and a few older portals, and the one format that
 * opens identically in Word, Pages and LibreOffice without a converter.
 *
 * Everything outside ASCII has to be escaped as a numeric entity: an em dash
 * written literally comes out as two mojibake characters, because the file
 * declares the ansi code page and readers believe it.
 */
function esc(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === "\\" || ch === "{" || ch === "}") out += `\\${ch}`;
    else if (code < 128) out += ch;
    // \\u takes a signed 16-bit value, so anything above 0x7FFF is written as
    // its negative counterpart. Word reads 8212 and 8212-65536 identically;
    // older readers only accept the signed form.
    else if (code <= 0xffff) out += `\\u${code > 32767 ? code - 65536 : code}?`;
    // Astral characters (emoji) need the surrogate pair spelled out. They have
    // no business on a resume, but dropping bytes silently is worse.
    else {
      const v = code - 0x10000;
      out += `\\u${0xd800 + (v >> 10) - 65536}?\\u${0xdc00 + (v & 0x3ff) - 65536}?`;
    }
  }
  return out;
}

/** Twips: a twentieth of a point, which is what RTF measures in. */
const size = (pt: number) => `\\fs${pt * 2}`;

export function toRtf(resume: Resume): string {
  const body: string[] = [];

  for (const line of toLines(resume)) {
    const text = esc(line.text);
    switch (line.kind) {
      case "name":
        body.push(`\\pard\\sb0\\sa60\\b${size(20)} ${text}\\b0${size(10.5)}\\par`);
        break;
      case "headline":
        body.push(`\\pard\\sa60${size(12)} ${text}${size(10.5)}\\par`);
        break;
      case "contact":
        body.push(`\\pard\\sa180 ${text}\\par`);
        break;
      case "heading":
        body.push(
          `\\pard\\sb240\\sa80\\b${size(12)} ${text.toUpperCase()}\\b0${size(10.5)}\\par`,
        );
        break;
      case "entryTitle":
        body.push(`\\pard\\sb120\\b ${text}\\b0\\par`);
        break;
      case "entryMeta":
        body.push(`\\pard\\i ${text}\\i0\\par`);
        break;
      case "bullet":
        // A real hanging indent, not a literal "- ". Word shows a bullet and
        // an extractor still sees one paragraph of text.
        body.push(`\\pard\\fi-284\\li284\\sa40 \\bullet\\tab ${text}\\par`);
        break;
      default:
        body.push(`\\pard\\sa80 ${text}\\par`);
        break;
    }
  }

  return [
    "{\\rtf1\\ansi\\ansicpg1252\\deff0",
    "{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}}",
    `\\margl1080\\margr1080\\margt1080\\margb1080\\f0${size(10.5)}`,
    ...body,
    "}",
  ].join("\n");
}
