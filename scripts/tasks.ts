/**
 * Every build-time job this project has, in one file.
 *
 * There used to be six scripts here, split by what they produced, plus two
 * runners: plain node for most and vite-node for the one that imports app
 * modules. The split cost more than it saved. Reading it meant opening six
 * files to answer "what runs before a build", and the odd one out looked
 * arbitrary without knowing why.
 *
 * None of this can live in src/. The app is a static browser bundle with no
 * server, and every task here writes a file, reads node_modules, or builds a
 * zip on disk.
 *
 * Usage: vite-node --config vitest.config.ts scripts/tasks.ts <task>
 *
 *   prep        tokens + worker. Runs before dev and build.
 *   tokens      src/app/tokens.generated.css from the TypeScript tokens
 *   worker      copies the pdf.js worker into public/
 *   fixtures    the sample documents in testing/, used by the test suite
 *   icons       the icon set, from icon.svg
 *   formula     Score-test/FORMULA.md, from the real scoring constants
 *   boundaries  the import rules from docs/03-architecture.md
 *
 * Run under vite-node rather than node because two tasks import app modules
 * to read their real values, and node cannot resolve extensionless TypeScript
 * imports.
 */
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";
import sharp from "sharp";

import {
  BAND_FLOOR,
  CEILING,
  FIELD_COSTS,
  FLAG_COSTS,
  STRUCTURE_COSTS,
  OVERSIZE_COST,
  PARSE_SIZE_LIMIT,
  SEVERITY_FLOOR,
  VERDICTS,
} from "../src/extract/score";
import { MAX_TERMS, STOPWORD_COUNT, STUFFING } from "../src/extract/keywords";
import { SPACING_TIERS } from "../src/extract/letterspacing";
import { PLACEHOLDER_COST } from "../src/extract/score";
import * as tokens from "../src/ui/tokens/tokens";

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = (rel: string, note = "") =>
  console.log(`  ${rel}${note ? `  ${note}` : ""}`);

/**
 * Colours are declared once in TypeScript, where the MUI theme reads them,
 * and emitted as a real stylesheet so content routes get them without an
 * injected <style> tag and without entering the hydration path.
 *
 * The old version stripped type annotations with a pile of regexes and
 * eval'd the result, to avoid pulling a bundler in for one file. Running
 * under vite-node means it can just import the module, which is both shorter
 * and impossible to break by writing an annotation the regexes did not
 * anticipate.
 */
function taskTokens() {
  const kebab = (s: string) =>
    s.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase();

  const block = (
    groups: Record<string, unknown>[],
    extra: [string, string][],
  ) => {
    const lines: string[] = [];
    for (const group of groups) {
      for (const [k, v] of Object.entries(group)) {
        lines.push(`  --${kebab(k)}: ${v as string};`);
      }
    }
    for (const [k, v] of extra) lines.push(`  --${k}: ${v};`);
    return lines;
  };

  /**
   * Everything that does not change with the scheme.
   *
   * The raw ramp is exposed so one-off CSS can reach a shade without inventing
   * one, and shape and motion are the same in the dark: a radius is not a
   * colour, and re-emitting them per scheme would invite them to drift.
   */
  const constants: string[] = [];
  for (const [k, v] of Object.entries(tokens.palette)) {
    constants.push(`  --c-${kebab(k)}: ${v};`);
  }
  for (const [k, v] of Object.entries(tokens.radius)) {
    constants.push(`  --radius-${k}: ${v}px;`);
  }
  constants.push(`  --dur-fast: ${tokens.motion.fast};`);
  constants.push(`  --dur-base: ${tokens.motion.base};`);
  constants.push(`  --dur-slow: ${tokens.motion.slow};`);
  constants.push(`  --ease: ${tokens.motion.ease};`);
  constants.push(`  --spring: ${tokens.motion.spring};`);

  const scheme = (which: "light" | "dark") => {
    const dark = which === "dark";
    const lines = block(
      [
        dark ? tokens.darkTone : tokens.tone,
        dark ? tokens.darkBlue : tokens.blue,
        dark ? tokens.darkSeverity : tokens.severity,
      ],
      [],
    );
    for (const [k, v] of Object.entries(
      dark ? tokens.darkShadow : tokens.shadow,
    )) {
      lines.push(`  --shadow-${k}: ${v as string};`);
    }
    lines.push(`  --edge: ${tokens.edge[which]};`);
    lines.push(`  --edge-soft: ${tokens.edgeSoft[which]};`);
    lines.push(`  --lift: ${tokens.lift[which]};`);
    lines.push(`  --on-accent: ${tokens.onAccent[which]};`);
    lines.push(`  color-scheme: ${which};`);
    return lines.join("\n");
  };

  /*
   * Three rules, in this order.
   *
   * The bare :root carries light, so a browser that never runs the theme
   * script still gets a complete stylesheet. The media query then follows the
   * operating system, but only while no choice has been made: the
   * :not([data-theme]) guard is what lets an explicit "light" beat a dark OS.
   * The attribute rule last, so a stated preference wins outright.
   */
  const css =
    "/* Generated from src/ui/tokens/tokens.ts by scripts/tasks.ts.\n" +
    "   Do not edit, run `npm run gen:tokens`. */\n\n" +
    `:root {\n${constants.join("\n")}\n\n${scheme("light")}\n}\n\n` +
    "@media (prefers-color-scheme: dark) {\n" +
    `  :root:not([data-theme]) {\n${scheme("dark").replace(/^/gm, "  ")}\n  }\n}\n\n` +
    `:root[data-theme="dark"] {\n${scheme("dark")}\n}\n`;

  writeFileSync(join(ROOT, "src/app/tokens.generated.css"), css);
  out("src/app/tokens.generated.css", "light + dark");
}

/**
 * pdf.js needs its worker as a real file at a known URL. A static export has
 * no server to hand out a hashed chunk, and a bare specifier would not
 * resolve in the browser. Copied at build time so its version cannot drift
 * from the library it was installed with.
 */
function taskWorker() {
  const source = join(
    dirname(require.resolve("pdfjs-dist/package.json")),
    "build",
    "pdf.worker.min.mjs",
  );
  const target = join(ROOT, "public", "pdf.worker.min.mjs");
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  out("public/pdf.worker.min.mjs");
}

/**
 * The sample documents in testing/.
 *
 * Generated rather than committed: binaries in a review diff are unreadable,
 * and a Windows checkout with autocrlf on would rewrite the text ones and
 * break the tests that assert their line endings. The folder is gitignored
 * and rebuilt before every test run.
 */
async function taskFixtures() {
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

  function write(rel: string, data: string | Uint8Array) {
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
  function para(text: string, style?: string) {
    const pr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
    // Split on the run boundary Word itself introduces mid-word after a spell
    // check, so extraction has to join runs rather than treat them as separate.
    return `<w:p>${pr}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
  }

  /** A run split across three <w:t> elements, one word, three fragments. */
  function splitPara(text: string) {
    const a = text.slice(0, 4);
    const b = text.slice(4, 9);
    const c = text.slice(9);
    return `<w:p>${[a, b, c]
    .map((s) => `<w:r><w:t xml:space="preserve">${s}</w:t></w:r>`)
    .join("")}</w:p>`;
  }

  function row(cells: string[]) {
    const tcs = cells
      .map(
        (c: string) =>
          `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${para(c)}</w:tc>`,
      )
      .join("");
    return `<w:tr>${tcs}</w:tr>`;
  }

  function table(rows: string[][]) {
    return `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/></w:tblPr>${rows
    .map(row)
    .join("")}</w:tbl>`;
  }

  // `extra` is spread straight into the archive, so it holds bytes, not text.
  function docx(bodyXml: string, extra: Record<string, Uint8Array> = {}) {
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
   * A headshot beside the text, which is conventional in much of Europe and
   * Asia and unreadable everywhere. The picture is a real part in the package,
   * because that is what the detector counts.
   */
  const DOCX_PHOTO = docx(
    [
      para(P.name, "Title"),
      para(`${P.email} | ${P.phone}`),
      `<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rId9"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`,
      para("Experience", "Heading1"),
      para(`${P.role1}, ${P.org1}`, "Heading2"),
      para(P.dates1),
      para(P.bullet1),
    ].join(""),
    // Only the path is read: the detector counts parts under word/media, and
    // never decodes one. A PNG signature is enough to make it a real picture.
    {
      "word/media/image1.png": new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]),
    },
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

  function odt(bodyXml: string) {
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

  const oPara = (t: string, style?: number) =>
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

  function pdf(objects: string[]) {
    const head = "%PDF-1.4\n";
    let body = "";
    const offsets: number[] = [];
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
  function tj(x: number, y: number, text: string, size = 11) {
    const escaped = text.replace(/([\\()])/g, "\\$1");
    return `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escaped}) Tj ET\n`;
  }

  function stream(content: string) {
    return `<< /Length ${content.length} >>\nstream\n${content}endstream`;
  }

  /** Catalog, pages, page, content, font, the five objects every page needs. */
  function onePage(content: string, extraPageEntries = "") {
    return pdf([
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> ${extraPageEntries}>>`,
      stream(content),
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]);
  }

  let y = 720;
  const line = (t: string, size?: number) => {
    const out = tj(72, y, t, size);
    y -= size && size > 11 ? 26 : 16;
    return out;
  };

  y = 720;
  /*
   * Bullet one is drawn over two lines because it does not fit the measure at
   * 11pt. It used to be emitted as a single run 542 points wide on a 612 point
   * page, which ran off the edge and cost the last three characters of the
   * sentence: a fixture that quietly lost text every time it was read.
   */
  const PDF_CLEAN = onePage(
    [
      line(P.name, 18),
      line(`${P.email} | ${P.phone} | ${P.city}`),
      line(""),
      line("EXPERIENCE", 13),
      line(`${P.role1}, ${P.org1}`),
      line(P.dates1),
      line("Cut median checkout latency from 840ms to 210ms by replacing"),
      line("per-request joins with a materialised read model."),
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

  /*
   * A bullet and a skills line that each run past the measure and wrap.
   *
   * A PDF has no notion of a paragraph, so each visual line arrives as its own
   * run of text. Without rejoining them a single bullet reaches the editor as
   * three fragments, which is what this file exists to catch. The wrapped lines
   * are drawn out to roughly the same right-hand edge, because that edge is the
   * signal that the line had no room left.
   */
  const PDF_WRAPPED = (() => {
    y = 720;
    return onePage(
      [
        line(P.name, 18),
        line("EXPERIENCE", 13),
        line(`${P.role1}, ${P.org1}`),
        // One bullet over three lines. Only the first carries the glyph.
        line("- Rebuilt the settlement pipeline as an event-driven service,"),
        line("  cutting end-to-end reconciliation time from six hours to eleven"),
        line("  minutes across every payment corridor."),
        // A short line: it ends deliberately and must not swallow what follows.
        line("- Mentored four engineers."),
        line("SKILLS", 13),
        line("Frontend: React, Next.js, Vue.js, Angular, Redux and Redux Toolkit,"),
        line("Context API, React Router, TanStack Query, Tailwind CSS, MUI, Ant"),
        line("Design and i18n"),
      ].join(""),
    );
  })();

  const FIXTURES: [string, string | Uint8Array, string][] = [
    ["pdf/clean-single-column.pdf", PDF_CLEAN,
      "The control case: real text, one column, correct order"],
    ["pdf/two-column-layout.pdf", PDF_TWO_COLUMN,
      "Contact rail beside a history column, emitted row by row"],
    ["pdf/no-text-layer.pdf", PDF_NO_TEXT_LAYER,
      "A page with no text at all \u2014 what a scan looks like"],
    ["pdf/two-pages.pdf", PDF_TWO_PAGE,
      "Page counting and cross-page ordering"],
    ["pdf/wrapped-lines.pdf", PDF_WRAPPED,
      "Bullets and skills that wrap, which must rejoin into one block each"],

    ["docx/clean-styled.docx", DOCX_CLEAN,
      "Real heading styles, plus one paragraph split across runs"],
    ["docx/layout-table.docx", DOCX_TABLE,
      "Employment history in a two-column table"],
    ["docx/contact-in-textbox.docx", DOCX_TEXTBOX,
      "Name and email parked in a VML text box"],
    ["docx/unstyled-paragraphs.docx", DOCX_UNSTYLED,
      "No styles anywhere, so headings must be inferred"],
    ["docx/photo.docx", DOCX_PHOTO,
      "A headshot beside the text — conventional in some markets, unreadable in all"],

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

  /*
   * Written from the same manifest as the files themselves, so the folder and
   * its documentation cannot drift. Not indented to match the surrounding
   * code: this is a template literal, and leading spaces would land in the
   * file.
   */
  const README = `# Sample documents

Generated, not committed. Rebuild them with:

\`\`\`sh
npm run fixtures
\`\`\`

Everything here is written by \`scripts/tasks.ts\` from one fictional person,
Alex Mercer, so extractions can be compared across formats directly. Nothing in
this folder is real, and none of it is in version control \u2014 see .gitignore.

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
}

/**
 * The icon set, rendered from the single master at icon.svg.
 *
 * Outputs are committed. They are brand assets rather than build artefacts,
 * and regenerating them on every install would put binary churn in every
 * diff.
 */
async function taskIcons() {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
  const svg = readFileSync(join(ROOT, "icon.svg"));

  /** The tile colour, also the theme-color in layout.tsx. */
  const TILE = "#0F6FB8";

  /*
   * Rasterised at high density and then resized, rather than rendered straight
   * to the target size. librsvg rounds geometry to the pixel grid as it draws,
   * so rendering a 32 unit grid at 16px loses the half-unit bar positions
   * outright. Drawing large and downsampling keeps them.
   */
  const png = (size: number) =>
    sharp(svg, { density: 512 }).resize(size, size).png();

  /**
   * Builds a .ico holding several sizes.
   *
   * Hand-assembled because sharp cannot emit ICO. The format is a 6 byte
   * header, a 16 byte directory entry per image, then the payloads. PNG
   * payloads are legal inside ICO and every browser still in use reads them,
   * which avoids encoding BMP with its upside-down rows and its doubled height
   * for the AND mask.
   */
  function ico(images: { size: number; data: Buffer }[]) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // 1 = icon, 2 would be cursor
    header.writeUInt16LE(images.length, 4);

    let offset = 6 + images.length * 16;
    const entries: Buffer[] = [];
    for (const { size, data } of images) {
      const entry = Buffer.alloc(16);
      // The field is one byte, so 256 is stored as 0.
      entry.writeUInt8(size >= 256 ? 0 : size, 0);
      entry.writeUInt8(size >= 256 ? 0 : size, 1);
      entry.writeUInt8(0, 2); // palette entries, 0 for truecolour
      entry.writeUInt8(0, 3); // reserved
      entry.writeUInt16LE(1, 4); // colour planes
      entry.writeUInt16LE(32, 6); // bits per pixel
      entry.writeUInt32LE(data.length, 8);
      entry.writeUInt32LE(offset, 12);
      entries.push(entry);
      offset += data.length;
    }

    return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
  }

  const log: string[] = [];
  const write = (rel: string, buf: Buffer) => {
    writeFileSync(join(ROOT, rel), buf);
    log.push(`  ${rel.padEnd(28)} ${(buf.length / 1024).toFixed(1)} KB`);
  };

  /*
   * Modern browsers scale the SVG themselves, so it is copied rather than
   * rasterised. Next generates the <link> tag for anything named icon.* in the
   * app directory.
   */
  write("src/app/icon.svg", svg);

  /*
   * iOS composites any transparency onto black and applies its own corner
   * rounding, so this one is flattened onto the tile colour first.
   */
  write(
    "src/app/apple-icon.png",
    await sharp(svg, { density: 512 })
      .resize(180, 180)
      .flatten({ background: TILE })
      .png()
      .toBuffer(),
  );

  /*
   * Legacy, and still the first thing several crawlers and feed readers ask
   * for. 48 is included because Windows taskbar pins use it.
   */
  write(
    "src/app/favicon.ico",
    ico(
      await Promise.all(
        [16, 32, 48].map(async (size) => ({
          size,
          data: await png(size).toBuffer(),
        })),
      ),
    ),
  );

  // Android install prompt, referenced from the manifest.
  for (const size of [192, 512]) {
    write(`public/icon-${size}.png`, await png(size).toBuffer());
  }

  console.log(`icons, from icon.svg\n${log.join("\n")}`);
}

/**
 * Score-test/FORMULA.md, rendered from the real scoring constants.
 *
 * The reason this file runs under vite-node: it imports the weights rather
 * than restating them, so the document cannot drift from the code.
 */
async function taskFormula() {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
  /** Sits with the research notes it was derived from. Gitignored, see .gitignore. */
  const OUT = join(ROOT, "Score-test", "FORMULA.md");

  /** Which severity label a cost lands on. Mirrors severity() in score.ts. */
  function severityOf(cost: number): string {
    if (cost >= SEVERITY_FLOOR.blocking) return "Blocking";
    if (cost >= SEVERITY_FLOOR.high) return "Major";
    if (cost >= SEVERITY_FLOOR.medium) return "Moderate";
    return "Minor";
  }

  type Row = { label: string; cost: number; source: string; detail: string };

  const fieldRows: Row[] = Object.entries(FIELD_COSTS).map(([key, v]) => ({
    label: `Missing ${key}`,
    cost: v.cost,
    source: v.basis.source,
    detail: v.detail,
  }));

  const flagRows: Row[] = Object.entries(FLAG_COSTS).map(([, v]) => ({
    label: v.label,
    cost: v.cost,
    source: v.basis.source,
    detail: "Raised by the extractor when it finds this in the document.",
  }));

  const sizeRow: Row = {
    label: `Over ${(PARSE_SIZE_LIMIT / 1024 / 1024).toFixed(1)}MB`,
    cost: OVERSIZE_COST,
    source: "Greenhouse Support, supported formats and parse limits",
    detail:
      "Greenhouse stops parsing above this size whatever the upload limit allows, so the file uploads and the record arrives empty.",
  };

  /** Detectors that produce a finding without living in either cost table. */
  const detectorRows: Row[] = [
    {
      label: `${SPACING_TIERS[0].label} (worst tier)`,
      cost: SPACING_TIERS[0].cost,
      source: "Greenhouse Support, Unsuccessful resume parse",
      detail:
        "Runs of four or more single-letter tokens. A parser cannot rejoin the characters, so the text contributes no searchable terms.",
    },
    {
      label: "Unfilled template text",
      cost: PLACEHOLDER_COST,
      source: "Greenhouse Support, Unsuccessful resume parse",
      detail:
        "Greenhouse skips data it reads as placeholder. In practice it usually means a template nobody finished.",
    },
  ];

  /** The structural checks. Every weight here is judged, none is cited. */
  const structureRows: Row[] = [
    {
      label: "No work history section",
      cost: STRUCTURE_COSTS.noWorkHistory,
      source: "Our judgement, extending a documented Greenhouse failure mode",
      detail:
        "No heading names a work history, so there is nothing to build a career timeline from and everything under the renamed heading is unmapped.",
    },
    {
      label: "Entries with no dates",
      cost: STRUCTURE_COSTS.undatedEntries,
      source: "Our judgement, not a published weight",
      detail:
        "A position with no date range cannot be placed on a timeline. Charged per document, not per entry: the document-level date field still passes, which is the hole this closes.",
    },
    {
      label: "Entries with no employer",
      cost: STRUCTURE_COSTS.orphanEntries,
      source: "Our judgement, not a published weight",
      detail:
        "A row with a title and dates but no company. The company field is the one most recruiter searches filter on.",
    },
    {
      label: "Headings a parser will not map",
      cost: STRUCTURE_COSTS.unmappedHeadings,
      source: "Our judgement, extending a documented Greenhouse failure mode",
      detail:
        "A heading that names no section a parser knows. Everything underneath goes unmapped.",
    },
    {
      label: "Mixed date formats",
      cost: STRUCTURE_COSTS.mixedDateFormats,
      source: "Our judgement, not a published weight",
      detail:
        "Two date shapes in one document. Duration is computed by pairing endpoints, so the mixture is the fault rather than either format.",
    },
    {
      label: "Ongoing role not marked Present",
      cost: STRUCTURE_COSTS.ongoingWording,
      source: "Our judgement, not a published weight",
      detail:
        "\"Current\", \"Now\", or a dash with nothing after it. An end a parser does not recognise is an end it does not record.",
    },
  ];

  const all = [...flagRows, ...fieldRows, ...detectorRows, ...structureRows, sizeRow].sort(
    (a, b) => b.cost - a.cost,
  );

  const fatal = all.filter((r) => r.cost >= SEVERITY_FLOOR.blocking);
  const scored = all.filter((r) => r.cost < SEVERITY_FLOOR.blocking);

  /** Deduplicated citations across every weight that has one. */
  const sources = [
    ...new Set(
      [...Object.values(FIELD_COSTS), ...Object.values(FLAG_COSTS)]
        .filter((v) => v.basis.url)
        .map(
          (v) => `${v.basis.source}\n  <${v.basis.url}>\n  ${v.basis.claim}`,
        ),
    ),
  ];

  const md = `# Scoring formula

Generated by \`npm run formula\` from \`src/extract/score.ts\` and
\`src/extract/keywords.ts\`. Not in version control: see .gitignore. Do not edit
this file, edit the code and regenerate.

## Shape

\`\`\`text
score = ${CEILING} × Π (1 - cost/100)      for every finding
\`\`\`

Multiplicative, not subtractive. Each cost is a **percentage of the remaining
score**, so a finding takes more off a clean document than off a wrecked one.
The old \`${CEILING} - sum(costs)\` had two problems: the costs summed to well
past ${CEILING}, so the top of the range did nothing, and anything past the
ceiling clipped to 0, which meant a real fix could move the score from 0 to 0.
Multiplying cannot go below zero, so nothing clips and every fix moves the
number.

The unit changed with the aggregate. A cost of 18 used to remove 18 points; now
it removes 18% of what is left. Ordering is unchanged, so the severity labels
still rank correctly.

The ceiling is ${CEILING}, not 100. No vendor publishes its parser rules, so a
perfect score would be a claim about software nobody outside those companies can
inspect.

## Fatal

These cost 100, so their factor is zero and the score reaches zero through the
same arithmetic as everything else. No short-circuit and no special case.

${fatal.map((r) => `- **${r.label}** (${r.cost})`).join("\n")}
- Empty extracted text, whatever the reason and whether or not a flag was raised

## Blockers, held outside the score

Not gradual, so they are neither multiplied in nor treated as fatal. A file the
portal will not accept never reaches a parser, so a number describing how well
it would have parsed is beside the point. Shown above the score; the score still
computes, because the content advice survives the re-export.

- **Format not accepted.** Greenhouse takes .pdf, .docx, .rtf and .txt. It does
  not take .odt or .md, both of which we can read and neither of which we should
  let somebody submit believing they scored 95.

## Scored findings

Sorted heaviest first, which is also the order the UI lists them in.

| Finding | Cost | Shown as | Rests on |
| --- | --- | --- | --- |
${scored
  .map((r) => `| ${r.label} | ${r.cost} | ${severityOf(r.cost)} | ${r.source} |`)
  .join("\n")}

Every one of these firing at once leaves ${Math.round(
  scored.reduce((acc, r) => acc * (1 - r.cost / 100), CEILING),
)}, reached by multiplication rather
than by clipping.

Letter-spaced text is tiered by how much of the document it covers
(${SPACING_TIERS.map((t) => t.cost).join(" / ")}), because a spaced-out heading and a spaced-out
resume are not the same problem.

## Severity labels

The UI shows these instead of the costs. Same ordering, no price list.

| Label | Cost at or above |
| --- | --- |
${Object.entries(SEVERITY_FLOOR)
  .map(([k, v]) => `| ${severityOf(v)} | ${v} |`)
  .join("\n")}

## Bands and verdicts

| Band | Score at or above | Verdict shown |
| --- | --- | --- |
${(Object.keys(BAND_FLOOR) as (keyof typeof BAND_FLOOR)[])
  .map((b) => `| ${b} | ${BAND_FLOOR[b]} | ${VERDICTS[b]} |`)
  .join("\n")}

## Skipped checks

A format that cannot fail a check has it listed as not scored, never as passed.

| Format depth | Not scored |
| --- | --- |
| layout (PDF, .docx, .odt) | nothing, every check applies |
| markup (.rtf) | reading order, column layout, text layer |
| text (.txt, .md) | reading order, column layout, text layer, tables |

## Keyword matching

Separate from the score and never folded into it. A resume is not worse for
failing to match a posting the person has not applied to.

- Terms reported: top ${MAX_TERMS}, ranked by how often the posting asks, then by phrase length
- Single words and two-word phrases; both halves of a phrase must carry signal
- Stopword list: ${STOPWORD_COUNT()} entries, ordinary English plus recruiting boilerplate
- Stuffing flagged when a term appears more than ${STUFFING.timesInResume} times in the resume **and** more than ${STUFFING.timesAsked}x what the posting asks
- Coverage is reported as "n of m terms", never as a percentage score
- Abbreviations are expanded in both directions and reported as **near misses**,
  never counted as matches. The screening systems match literal text, so scoring
  \`K8s\` as \`Kubernetes\` would flatter the figure with a match they will not
  make. Ambiguous ones (\`PM\`, \`CS\`, \`SA\`) surface every reading and pick none.

## Every citation

${sources.map((s) => `- ${s}`).join("\n")}

## Judgement calls, not citations

These are the numbers to argue with:

- The exact boundary between Major and Moderate (${SEVERITY_FLOOR.high} and ${SEVERITY_FLOOR.medium})
- ${OVERSIZE_COST} for oversize. Greenhouse stops *parsing* at 2.5MB but accepts uploads
  to 100MB, so the file attaches and a recruiter re-keys it. Auto-fill fails,
  nobody is rejected. This was 30, which overstated it.
- 28 for column layout and reading order merged. 22 was the higher of the two
  costs it replaces, plus a margin because columns also confuse section
  boundaries. The two used to bill separately, 42 points for one defect.
- ${SPACING_TIERS.map((t) => t.cost).join(" / ")} for the letter-spacing tiers, and the 20% / 5% boundaries between them
- ${PLACEHOLDER_COST} for unfilled template text, priced as a lost employer name
- Every structural weight: ${Object.values(STRUCTURE_COSTS).join(" / ")}. Nobody publishes what an undated
  job or a renamed section costs, so these are ours. They carry
  \`basis.judged\`, are never rendered beside somebody else's link, and are the
  reason the contract is "every weight declares where it came from" rather than
  "every weight is cited" — which was never true, as the two entries above it
  show.
- The band boundaries (${BAND_FLOOR.clean} / ${BAND_FLOOR.minor} / ${BAND_FLOOR.risky}). Set by what each band should mean, not
  measured. The only corpus is the fixtures in testing/, which were built to
  exercise detectors rather than to represent real resumes, so reading
  boundaries off their distribution would be measurement theatre.

Everything else traces to a source in the list above.

## Not implemented, on purpose

Symptom suppression, where a text box or page header would zero the missing
contact fields it explains, was specified and rejected. On DOCX and ODT we read
text box, header and footer contents into the main text, so a trapped email is
found and \`Missing email\` never fires alongside \`Text box\`. The two only
co-occur when the email is genuinely absent, which is exactly when suppressing
it would be wrong. PDF has no text-box detector at all yet, which is the real
gap the proposal found while looking somewhere else.
`;

  writeFileSync(OUT, md);
  console.log(
    `FORMULA.md  ${scored.length + fatal.length} weights, ${sources.length} citations`,
  );
}

/**
 * The import rules from docs/03-architecture.md.
 *
 * Not a generator, but it lives here for the same reason as the rest: there
 * is no ESLint in this project, so this is the only static analysis of
 * imports there is, and one file is easier to find than two.
 */
async function taskBoundaries() {
  const root = process.cwd();

  const RULES = [
    {
      dir: "src/render",
      forbid: /from\s+["']@mui\//,
      message: "must not import from @mui/*, the document uses plain CSS",
    },
    {
      dir: "src/render",
      forbid: /from\s+["']@emotion\//,
      message: "must not import from @emotion/*, styles must stay declared",
    },
    {
      dir: "src/schema",
      forbid: /from\s+["'](@mui|react|next)\//,
      message: "must stay framework-free so it can run in tests and workers",
    },
    {
      /*
       * Content routes must not pull the MUI runtime. This regressed once by
       * accident: a barrel that exported both design tokens and the MUI theme
       * meant importing a colour put 33KB of Emotion on every static page.
       * Tokens live in @/ui/tokens, which imports nothing.
       */
      dir: "src/app",
      skip: /^src[\\/]app[\\/]resume-builder[\\/]/,
      forbid: /from\s+["'](@mui\/|@emotion\/|@\/ui\/theme|@\/ui\/editor|@\/ui\/design)/,
      message:
        "content routes must not import MUI or editor chrome, only /resume-builder may",
    },
    {
      dir: "src/ui/tokens",
      forbid: /^\s*import\s/m,
      message: "must import nothing, so any route can read a token cheaply",
    },
    {
      dir: "src/ui/site",
      forbid: /from\s+["'](@mui\/|@emotion\/)/,
      message: "site chrome is plain CSS. MUI belongs to the editor",
    },
    {
      /*
       * House style: no em dashes in anything a person reads. Enforced rather
       * than remembered, because they come back one copy edit at a time.
       *
       * Only the interface. The readers in src/extract match a literal em dash
       * in date ranges and bullet glyphs, which is other people's text and not
       * ours to restyle.
       */
      dir: "src/ui",
      forbid: /—/,
      message: "no em dashes: use a comma, a colon, or two sentences",
    },
    {
      dir: "src/app",
      forbid: /—/,
      message: "no em dashes: use a comma, a colon, or two sentences",
    },
    {
      /*
       * Document readers stay framework-free: they run in a Node test process
       * with no DOM, which is why the XML scanner exists instead of DOMParser.
       */
      dir: "src/extract",
      forbid: /from\s+["'](@mui\/|@emotion\/|react|next\/|@\/ui\/)/,
      message: "extractors must run without a DOM or a framework",
    },
    {
      /*
       * The readers are loaded on demand from src/extract/index.ts. A static
       * import anywhere else drags the zip inflater and pdf.js onto every page,
       * which is exactly the regression this rule exists to catch.
       */
      dir: "src",
      // Tests name a reader on purpose: they exercise one at a time, and they
      // ship nothing.
      skip: /^src[\\/]extract[\\/]|\.test\.tsx?$/,
      forbid: /from\s+["']@\/extract\/(docx|odt|pdf|rtf|html|text|zip|xml)/,
      message:
        "import a reader through @/extract so it stays lazily loaded, not directly",
    },
  ];

  function walk(dir: string): string[] {
    const out: string[] = [];
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return out;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) out.push(...walk(full));
      else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
    }
    return out;
  }

  let failures = 0;

  for (const rule of RULES) {
    for (const file of walk(join(root, rule.dir))) {
      if (rule.skip?.test(relative(root, file))) continue;
      const source = readFileSync(file, "utf8");
      source.split("\n").forEach((line, i) => {
        if (rule.forbid.test(line)) {
          failures++;
          console.error(
            `${relative(root, file)}:${i + 1}  ${rule.dir} ${rule.message}\n    ${line.trim()}`,
          );
        }
      });
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} boundary violation(s).`);
    process.exit(1);
  }

  console.log("Boundaries OK.");
}


const TASKS: Record<string, () => void | Promise<void>> = {
  tokens: taskTokens,
  worker: taskWorker,
  fixtures: taskFixtures,
  icons: taskIcons,
  formula: taskFormula,
  boundaries: taskBoundaries,
  // What has to exist before dev or build: generated CSS and the pdf worker.
  prep: async () => {
    taskTokens();
    taskWorker();
  },
};

const name = process.argv[2];
const task = name ? TASKS[name] : undefined;

if (!task) {
  console.error(
    `Unknown task ${name ? `"${name}"` : "(none given)"}.\n` +
      `Available: ${Object.keys(TASKS).join(", ")}`,
  );
  process.exit(1);
}

console.log(`${name}:`);
await task();
