import { strToU8, zipSync } from "fflate";
import type { Resume } from "@/schema";
import { toLines } from "./model";

/**
 * Word (.docx).
 *
 * Written by hand rather than with a document library, for the same reason the
 * reader is: the output has to be boring on purpose. No tables, no text boxes,
 * no columns, no header, every one of those is something the checker warns
 * about, and shipping an exporter that produces them would be indefensible.
 *
 * Structure is carried by real named styles. A parser that understands Word
 * styles gets headings; one that does not still gets paragraphs in the right
 * order, which is the whole point.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const NS = [
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
].join(" ");

/** Half-points, which is the unit w:sz takes. */
const half = (pt: number) => Math.round(pt * 2);

function para(
  text: string,
  opts: {
    style?: string;
    bold?: boolean;
    italic?: boolean;
    size?: number;
    before?: number;
    after?: number;
    bullet?: boolean;
  } = {},
): string {
  const props: string[] = [];
  if (opts.style) props.push(`<w:pStyle w:val="${opts.style}"/>`);
  if (opts.bullet) props.push('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
  props.push(
    `<w:spacing w:before="${(opts.before ?? 0) * 20}" w:after="${(opts.after ?? 4) * 20}"/>`,
  );

  const runProps: string[] = [];
  if (opts.bold) runProps.push("<w:b/>");
  if (opts.italic) runProps.push("<w:i/>");
  if (opts.size) runProps.push(`<w:sz w:val="${half(opts.size)}"/>`);

  return [
    "<w:p>",
    `<w:pPr>${props.join("")}</w:pPr>`,
    "<w:r>",
    runProps.length ? `<w:rPr>${runProps.join("")}</w:rPr>` : "",
    `<w:t xml:space="preserve">${esc(text)}</w:t>`,
    "</w:r>",
    "</w:p>",
  ].join("");
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

/*
 * Heading1 and Heading2 by their real ids. A resume exported with invented
 * style names loses its outline in every tool that reads Word structure.
 */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${NS}>
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="21"/>
</w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Title">
<w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1">
<w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2">
<w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph">
<w:name w:val="List Paragraph"/></w:style>
</w:styles>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${NS}>
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0">
<w:numFmt w:val="bullet"/><w:lvlText w:val="•"/>
<w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr>
</w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

export function toDocx(resume: Resume): Uint8Array {
  const body = toLines(resume)
    .map((line) => {
      switch (line.kind) {
        case "name":
          return para(line.text, { style: "Title", size: 20, bold: true, after: 2 });
        case "headline":
          return para(line.text, { size: 12, after: 2 });
        case "contact":
          return para(line.text, { after: 10 });
        case "heading":
          return para(line.text.toUpperCase(), {
            style: "Heading1",
            bold: true,
            size: 12,
            before: 12,
            after: 4,
          });
        case "entryTitle":
          return para(line.text, { style: "Heading2", bold: true, before: 6 });
        case "entryMeta":
          return para(line.text, { italic: true, after: 2 });
        case "bullet":
          return para(line.text, { style: "ListParagraph", bullet: true, after: 2 });
        default:
          return para(line.text, { after: 4 });
      }
    })
    .join("");

  /*
   * One section, one column, ordinary margins. w:sectPr is required, without
   * it Word decides the page size itself, and has been known to choose A4 for
   * a document written in the US and Letter for one written in Europe.
   */
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NS}><w:body>${body}<w:sectPr>
<w:pgSz w:w="12240" w:h="15840"/>
<w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>
<w:cols w:space="708"/>
</w:sectPr></w:body></w:document>`;

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>${esc(resume.basics.fullName || resume.name)}</dc:title>
<dc:creator>${esc(resume.basics.fullName)}</dc:creator>
</cp:coreProperties>`;

  return zipSync({
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(ROOT_RELS),
    "docProps/core.xml": strToU8(core),
    "word/_rels/document.xml.rels": strToU8(DOC_RELS),
    "word/document.xml": strToU8(document),
    "word/numbering.xml": strToU8(NUMBERING),
    "word/styles.xml": strToU8(STYLES),
  });
}
