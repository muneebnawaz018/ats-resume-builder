/**
 * Builds the sample documents under testing/.
 *
 * They are generated rather than committed as opaque binaries so that every
 * byte is accounted for: when a test says "the employer went missing", the
 * reason is visible a few lines up in this file rather than buried in a zip
 * somebody produced in Word four months ago.
 *
 * One folder per extension, several files per folder, each named after the
 * thing it is meant to break. Run: npm run fixtures
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync, strToU8 } from "fflate";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "testing");

/** The same person in every file, so extractions can be compared directly. */
const P = {
  name: "Alex Mercer",
  title: "Senior Backend Engineer",
  email: "alex.mercer@example.com",
  phone: "+1 415 555 0142",
  city: "San Francisco, CA",
  site: "alexmercer.dev",
  org1: "Northwind Systems",
  role1: "Senior Backend Engineer",
  dates1: "March 2021 — Present",
  org2: "Bellweather Data",
  role2: "Backend Engineer",
  dates2: "June 2018 — February 2021",
  bullet1:
    "Cut median checkout latency from 840ms to 210ms by replacing per-request joins with a materialised read model.",
  bullet2:
    "Led the migration of 14 services off a shared database, delivered with no downtime window.",
  skills: "Go, PostgreSQL, Kafka, Terraform, AWS",
};

function write(rel, data) {
  const path = join(OUT, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log("  " + rel);
}

/* ------------------------------------------------------------------ *
 * plain text
 * ------------------------------------------------------------------ */

const TXT_CLEAN = `${P.name}
${P.email} | ${P.phone} | ${P.city}

EXPERIENCE

${P.role1}
${P.org1}
${P.dates1}
- ${P.bullet1}
- ${P.bullet2}

${P.role2}
${P.org2}
${P.dates2}
- Built the ingest pipeline that still carries 40k events a second.

EDUCATION

BSc Computer Science, University of Washington, 2018

SKILLS

${P.skills}
`;

/*
 * Everything the clean file has, with none of the signposts: no section
 * headings, no blank lines, contact details buried in a sentence. A parser
 * has to fall back on pattern matching for all of it.
 */
const TXT_UNSTRUCTURED = `${P.name} is a backend engineer in ${P.city} reachable on ${P.phone} or at ${P.email}.
He has worked at ${P.org1} since March 2021 as a ${P.role1}, before which he spent nearly three years at ${P.org2}.
${P.bullet1}
Comfortable with ${P.skills}.
`;

/* Windows line endings and a byte order mark, both survive real uploads. */
const TXT_CRLF = "﻿" + TXT_CLEAN.replace(/\n/g, "\r\n");

const MD_CLEAN = `# ${P.name}

${P.email} · ${P.phone} · [${P.site}](https://${P.site})

## Experience

### ${P.role1} — ${P.org1}
*${P.dates1}*

- ${P.bullet1}
- ${P.bullet2}

### ${P.role2} — ${P.org2}
*${P.dates2}*

- Built the ingest pipeline that still carries 40k events a second.

## Skills

${P.skills}
`;

/*
 * A markdown table for the employment history. Tables are the single most
 * common way a resume loses its dates, and markdown is the cheapest place to
 * check that the extractor reads one row-wise rather than column-wise.
 */
const MD_TABLE = `# ${P.name}

${P.email} | ${P.phone}

## Experience

| Role | Company | Dates |
| --- | --- | --- |
| ${P.role1} | ${P.org1} | ${P.dates1} |
| ${P.role2} | ${P.org2} | ${P.dates2} |

## Skills

${P.skills}
`;

/* ------------------------------------------------------------------ *
 * rtf
 * ------------------------------------------------------------------ */

const RTF_CLEAN = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}
\\f0\\fs28\\b ${P.name}\\b0\\fs22\\par
${P.email} | ${P.phone} | ${P.city}\\par
\\par
\\b EXPERIENCE\\b0\\par
${P.role1}, ${P.org1}\\par
${P.dates1}\\par
\\bullet\\tab ${P.bullet1}\\par
\\bullet\\tab ${P.bullet2}\\par
\\par
\\b SKILLS\\b0\\par
${P.skills}\\par
}
`;

/*
 * Escaped punctuation and a unicode run: an em dash as \\'97 in the ansi code
 * page and a name with an accent as \\u233. Both come out as noise if the
 * escape handling is missing.
 */
const RTF_ESCAPES = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}
\\f0 Ana\\u239\\'3fs Renaud\\'97 backend engineer\\par
ana@example.com | +33 1 45 67 89 10\\par
\\par
\\b EXPERIENCE\\b0\\par
Plateforme Nord \\u8212\\'3f Senior Engineer\\par
January 2020 \\u8211\\'3f Present\\par
Built the billing service. Costs fell 32\\'25 in the first quarter.\\par
}
`;

/* ------------------------------------------------------------------ *
 * docx / odt, both are zips of xml
 * ------------------------------------------------------------------ */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdH1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`;

const W_NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`;

/** A paragraph, optionally with a named style so headings stay identifiable. */
function para(text, style) {
  const pr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  // Split on the run boundary Word itself introduces mid-word after a spell
  // check, so extraction has to join runs rather than treat them as separate.
  return `<w:p>${pr}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

/** A run split across three <w:t> elements, one word, three fragments. */
function splitPara(text) {
  const a = text.slice(0, 4);
  const b = text.slice(4, 9);
  const c = text.slice(9);
  return `<w:p>${[a, b, c]
    .map((s) => `<w:r><w:t xml:space="preserve">${s}</w:t></w:r>`)
    .join("")}</w:p>`;
}

function row(cells) {
  const tcs = cells
    .map(
      (c) =>
        `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${para(c)}</w:tc>`,
    )
    .join("");
  return `<w:tr>${tcs}</w:tr>`;
}

function table(rows) {
  return `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/></w:tblPr>${rows
    .map(row)
    .join("")}</w:tbl>`;
}

function docx(bodyXml, extra = {}) {
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W_NS}><w:body>${bodyXml}<w:sectPr><w:headerReference w:type="default" r:id="rIdH1"/></w:sectPr></w:body></w:document>`;

  const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr ${W_NS}>${para(`${P.email} | ${P.phone}`)}</w:hdr>`;

  return zipSync({
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(ROOT_RELS),
    "word/_rels/document.xml.rels": strToU8(DOC_RELS),
    "word/document.xml": strToU8(document),
    "word/header1.xml": strToU8(header),
    ...extra,
  });
}

const DOCX_CLEAN = docx(
  [
    para(P.name, "Title"),
    para(`${P.email} | ${P.phone} | ${P.city}`),
    para("Experience", "Heading1"),
    para(`${P.role1}, ${P.org1}`, "Heading2"),
    para(P.dates1),
    para(P.bullet1, "ListParagraph"),
    para(P.bullet2, "ListParagraph"),
    para(`${P.role2}, ${P.org2}`, "Heading2"),
    para(P.dates2),
    para("Skills", "Heading1"),
    // The one paragraph whose text is fragmented across runs.
    splitPara(P.skills),
  ].join(""),
);

/*
 * The classic damage: employment history in a two-column layout table. Read
 * down the columns instead of across the rows and every date detaches from
 * the job it belongs to.
 */
const DOCX_TABLE = docx(
  [
    para(P.name, "Title"),
    para(`${P.email} | ${P.phone}`),
    para("Experience", "Heading1"),
    table([
      [P.dates1, `${P.role1}, ${P.org1}`],
      [P.dates2, `${P.role2}, ${P.org2}`],
    ]),
    para("Skills", "Heading1"),
    para(P.skills),
  ].join(""),
);

/*
 * Contact details inside a VML text box, which is how design templates park a
 * sidebar. Plenty of extractors never look inside one, so the name and email
 * simply are not in the output.
 */
const DOCX_TEXTBOX = docx(
  [
    `<w:p><w:r><w:pict><v:shape style="width:200pt;height:80pt"><v:textbox><w:txbxContent>${para(
      P.name,
    )}${para(P.email)}${para(P.phone)}</w:txbxContent></v:textbox></v:shape></w:r></w:p>`,
    para("Experience", "Heading1"),
    para(`${P.role1}, ${P.org1}`, "Heading2"),
    para(P.dates1),
    para(P.bullet1),
  ].join(""),
);

/*
 * Nothing but paragraphs, no styles at all, so heading detection has to work
 * from the text itself. Real resumes exported from design tools look like
 * this.
 */
const DOCX_UNSTYLED = docx(
  [
    para(P.name),
    para(`${P.email} | ${P.phone}`),
    para("EXPERIENCE"),
    para(`${P.role1} at ${P.org1}`),
    para(P.dates1),
    para(P.bullet1),
    para("SKILLS"),
    para(P.skills),
  ].join(""),
);

/* ---- odt ---- */

const ODT_STYLES = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.3"/>`;

const ODT_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;

const O_NS = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"`;

function odt(bodyXml) {
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${O_NS} office:version="1.3"><office:body><office:text>${bodyXml}</office:text></office:body></office:document-content>`;

  /*
   * The mimetype entry must come first and be stored uncompressed, that is
   * what lets a reader identify the file from its first thirty bytes without
   * unzipping it. zipSync writes entries in key order, so this stays first.
   */
  return zipSync({
    mimetype: [
      strToU8("application/vnd.oasis.opendocument.text"),
      { level: 0 },
    ],
    "META-INF/manifest.xml": strToU8(ODT_MANIFEST),
    "styles.xml": strToU8(ODT_STYLES),
    "content.xml": strToU8(content),
  });
}

const oPara = (t, style) =>
  style
    ? `<text:h text:outline-level="${style}">${t}</text:h>`
    : `<text:p>${t}</text:p>`;

const ODT_CLEAN = odt(
  [
    oPara(P.name, 1),
    oPara(`${P.email} | ${P.phone} | ${P.city}`),
    oPara("Experience", 1),
    oPara(`${P.role1}, ${P.org1}`, 2),
    oPara(P.dates1),
    oPara(P.bullet1),
    oPara(P.bullet2),
    oPara("Skills", 1),
    oPara(P.skills),
  ].join(""),
);

const ODT_TABLE = odt(
  [
    oPara(P.name, 1),
    oPara(`${P.email} | ${P.phone}`),
    oPara("Experience", 1),
    `<table:table table:name="jobs">
      <table:table-column table:number-columns-repeated="2"/>
      <table:table-row><table:table-cell>${oPara(
        P.dates1,
      )}</table:table-cell><table:table-cell>${oPara(
        `${P.role1}, ${P.org1}`,
      )}</table:table-cell></table:table-row>
      <table:table-row><table:table-cell>${oPara(
        P.dates2,
      )}</table:table-cell><table:table-cell>${oPara(
        `${P.role2}, ${P.org2}`,
      )}</table:table-cell></table:table-row>
    </table:table>`,
  ].join(""),
);

/* ------------------------------------------------------------------ *
 * pdf
 *
 * Written by hand rather than rendered, so the text operators are exactly
 * what the test is about. Each object is appended in order and the byte
 * offsets are measured as we go, because the cross-reference table has to
 * name the position of every object.
 * ------------------------------------------------------------------ */

function pdf(objects) {
  const head = "%PDF-1.4\n";
  let body = "";
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(head.length + body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefAt = head.length + body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  const tail = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(head + body + xref + tail, "latin1");
}

/** A text-drawing operator at an absolute position on the page. */
function tj(x, y, text, size = 11) {
  const escaped = text.replace(/([\\()])/g, "\\$1");
  return `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escaped}) Tj ET\n`;
}

function stream(content) {
  return `<< /Length ${content.length} >>\nstream\n${content}endstream`;
}

/** Catalog, pages, page, content, font, the five objects every page needs. */
function onePage(content, extraPageEntries = "") {
  return pdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> ${extraPageEntries}>>`,
    stream(content),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]);
}

let y = 720;
const line = (t, size) => {
  const out = tj(72, y, t, size);
  y -= size && size > 11 ? 26 : 16;
  return out;
};

y = 720;
const PDF_CLEAN = onePage(
  [
    line(P.name, 18),
    line(`${P.email} | ${P.phone} | ${P.city}`),
    line(""),
    line("EXPERIENCE", 13),
    line(`${P.role1}, ${P.org1}`),
    line(P.dates1),
    line(P.bullet1),
    line(P.bullet2),
    line(`${P.role2}, ${P.org2}`),
    line(P.dates2),
    line("SKILLS", 13),
    line(P.skills),
  ].join(""),
);

/*
 * Two columns: a narrow left rail of contact details and a wide right column
 * of history, with the operators interleaved by row the way a layout engine
 * emits them. Read in emission order and every line reads as
 * "Email  Senior Backend Engineer", the specific failure this file exists to
 * catch.
 */
const PDF_TWO_COLUMN = (() => {
  const rows = [
    ["CONTACT", "EXPERIENCE"],
    [P.email, `${P.role1}, ${P.org1}`],
    [P.phone, P.dates1],
    [P.city, P.bullet1],
    ["SKILLS", `${P.role2}, ${P.org2}`],
    [P.skills.split(",")[0], P.dates2],
  ];
  let top = 700;
  let content = tj(72, 740, P.name, 18);
  for (const [left, right] of rows) {
    content += tj(72, top, left) + tj(260, top, right);
    top -= 22;
  }
  return onePage(content);
})();

/*
 * A page with no text operators at all, one grey rectangle standing in for a
 * scan. Every applicant tracking system scores this zero, and the person who
 * uploaded it has no way of knowing.
 */
const PDF_NO_TEXT_LAYER = onePage("0.8 g 72 520 468 200 re f\n");

/* Two pages, so page counting and cross-page ordering are exercised. */
const PDF_TWO_PAGE = pdf([
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>",
  stream(
    tj(72, 720, P.name, 18) +
      tj(72, 690, `${P.email} | ${P.phone}`) +
      tj(72, 650, "EXPERIENCE", 13) +
      tj(72, 620, `${P.role1}, ${P.org1}`) +
      tj(72, 600, P.dates1),
  ),
  stream(
    tj(72, 720, `${P.role2}, ${P.org2}`) +
      tj(72, 700, P.dates2) +
      tj(72, 660, "EDUCATION", 13) +
      tj(72, 640, "BSc Computer Science, University of Washington, 2018"),
  ),
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
]);

/* ------------------------------------------------------------------ *
 * files we refuse, the rejection path needs samples too
 * ------------------------------------------------------------------ */

/* A real Word 97 file starts with the compound-file signature. */
const DOC_SIGNATURE = Buffer.concat([
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  Buffer.alloc(504),
  Buffer.from(`${P.name} ${P.email}`, "latin1"),
]);

/* Pages files are zips too, which is exactly why the extension has to decide. */
const PAGES_BUNDLE = zipSync({
  "Index/Document.iwa": new Uint8Array([0x00, 0x01, 0x02, 0x03]),
  "Metadata/Properties.plist": strToU8("<plist/>"),
});

/* Smallest valid PNG: 1×1, transparent. */
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * the manifest
 *
 * Path, bytes, and why the file exists. The README is generated from this
 * same list, so the folder and its documentation cannot drift apart, the
 * previous version was a hand-written table that went stale the first time a
 * fixture was removed.
 * ------------------------------------------------------------------ */

const FIXTURES = [
  ["pdf/clean-single-column.pdf", PDF_CLEAN,
    "The control case: real text, one column, correct order"],
  ["pdf/two-column-layout.pdf", PDF_TWO_COLUMN,
    "Contact rail beside a history column, emitted row by row"],
  ["pdf/no-text-layer.pdf", PDF_NO_TEXT_LAYER,
    "A page with no text at all \u2014 what a scan looks like"],
  ["pdf/two-pages.pdf", PDF_TWO_PAGE,
    "Page counting and cross-page ordering"],

  ["docx/clean-styled.docx", DOCX_CLEAN,
    "Real heading styles, plus one paragraph split across runs"],
  ["docx/layout-table.docx", DOCX_TABLE,
    "Employment history in a two-column table"],
  ["docx/contact-in-textbox.docx", DOCX_TEXTBOX,
    "Name and email parked in a VML text box"],
  ["docx/unstyled-paragraphs.docx", DOCX_UNSTYLED,
    "No styles anywhere, so headings must be inferred"],

  ["odt/clean-styled.odt", ODT_CLEAN,
    "The LibreOffice equivalent of the clean Word file"],
  ["odt/layout-table.odt", ODT_TABLE, "Same table damage, in ODF"],

  ["rtf/clean.rtf", RTF_CLEAN,
    "Control words, and a font table that must not leak into the text"],
  ["rtf/escapes-and-unicode.rtf", RTF_ESCAPES,
    "`\\'97` em dash, `\\u239` accent, `\\'25` percent sign"],

  ["txt/clean-sections.txt", TXT_CLEAN,
    "Capitalised section headings and dash bullets"],
  ["txt/unstructured-prose.txt", TXT_UNSTRUCTURED,
    "Everything present, no signposts at all"],
  ["txt/crlf-with-bom.txt", TXT_CRLF,
    "Windows line endings and a byte order mark"],

  ["md/clean-sections.md", MD_CLEAN,
    "ATX headings, emphasis, one link with a target"],
  ["md/history-in-table.md", MD_TABLE,
    "Employment history in a Markdown table"],

  ["rejected/word-97.doc", DOC_SIGNATURE,
    "Compound-file signature \u2014 offered, refused, told to convert"],
  ["rejected/apple-pages.pages", PAGES_BUNDLE,
    "A zip that is not a document, which is why the extension decides"],
  ["rejected/scan.png", PNG_1PX,
    "An image, refused before anything tries to read it"],
  ["rejected/empty.pdf", Buffer.alloc(0), "Zero bytes"],
];

const README = `# Sample documents

Generated, not committed. Rebuild them with:

\`\`\`sh
npm run fixtures
\`\`\`

Everything here is written by \`scripts/make-fixtures.mjs\` from one fictional
person, Alex Mercer, so extractions can be compared across formats directly.
Nothing in this folder is real, and none of it is in version control \u2014 see
.gitignore.

One folder per extension the picker accepts, plus \`rejected/\` for the files it
turns away. Each file is named after the thing it is meant to break.

| File | What it is for |
| --- | --- |
${FIXTURES.map(([path, , note]) => `| \`${path}\` | ${note} |`).join("\n")}

\`src/extract/extract.test.ts\` asserts against every one of them.
`;

rmSync(OUT, { recursive: true, force: true });
console.log("testing/");

for (const [path, data] of FIXTURES) write(path, data);
write("README.md", README);

console.log("\nDone.");
