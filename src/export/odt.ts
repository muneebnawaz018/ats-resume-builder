import { strToU8, zipSync } from "fflate";
import type { Resume } from "@/schema";
import { toLines } from "./model";

/**
 * OpenDocument text (.odt). LibreOffice, and what a few European employers
 * ask for by name.
 *
 * Cheap to add once the Word writer exists, and ODF is the friendlier of the
 * two formats to write: a heading is <text:h> with an outline level, so the
 * document outline survives without depending on a style id being spelled
 * exactly right.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const NS = [
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
].join(" ");

const MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles ${NS} office:version="1.3">
<office:styles>
<style:style style:name="Standard" style:family="paragraph">
<style:text-properties style:font-name="Calibri" fo:font-size="10.5pt"/>
</style:style>
</office:styles>
</office:document-styles>`;

/** Declared in content.xml so a reader needs no second file to lay this out. */
const AUTO_STYLES = `<office:automatic-styles>
<style:style style:name="Name" style:family="paragraph" style:parent-style-name="Standard">
<style:paragraph-properties fo:margin-bottom="0.06in"/>
<style:text-properties fo:font-size="20pt" fo:font-weight="bold"/>
</style:style>
<style:style style:name="Headline" style:family="paragraph" style:parent-style-name="Standard">
<style:text-properties fo:font-size="12pt"/>
</style:style>
<style:style style:name="Contact" style:family="paragraph" style:parent-style-name="Standard">
<style:paragraph-properties fo:margin-bottom="0.16in"/>
</style:style>
<style:style style:name="SectionHead" style:family="paragraph" style:parent-style-name="Standard">
<style:paragraph-properties fo:margin-top="0.18in" fo:margin-bottom="0.05in"/>
<style:text-properties fo:font-size="12pt" fo:font-weight="bold"/>
</style:style>
<style:style style:name="EntryTitle" style:family="paragraph" style:parent-style-name="Standard">
<style:paragraph-properties fo:margin-top="0.08in"/>
<style:text-properties fo:font-weight="bold"/>
</style:style>
<style:style style:name="EntryMeta" style:family="paragraph" style:parent-style-name="Standard">
<style:text-properties fo:font-style="italic"/>
</style:style>
<style:style style:name="Bullet" style:family="paragraph" style:parent-style-name="Standard">
<style:paragraph-properties fo:margin-left="0.25in" fo:text-indent="-0.25in"/>
</style:style>
</office:automatic-styles>`;

export function toOdt(resume: Resume): Uint8Array {
  const body = toLines(resume)
    .map((line) => {
      const text = esc(line.text);
      switch (line.kind) {
        case "name":
          return `<text:h text:outline-level="1" text:style-name="Name">${text}</text:h>`;
        case "headline":
          return `<text:p text:style-name="Headline">${text}</text:p>`;
        case "contact":
          return `<text:p text:style-name="Contact">${text}</text:p>`;
        case "heading":
          return `<text:h text:outline-level="2" text:style-name="SectionHead">${text.toUpperCase()}</text:h>`;
        case "entryTitle":
          return `<text:h text:outline-level="3" text:style-name="EntryTitle">${text}</text:h>`;
        case "entryMeta":
          return `<text:p text:style-name="EntryMeta">${text}</text:p>`;
        case "bullet":
          return `<text:list><text:list-item><text:p text:style-name="Bullet">${text}</text:p></text:list-item></text:list>`;
        default:
          return `<text:p text:style-name="Standard">${text}</text:p>`;
      }
    })
    .join("");

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${NS} office:version="1.3">
${AUTO_STYLES}
<office:body><office:text>${body}</office:text></office:body>
</office:document-content>`;

  /*
   * mimetype first and stored uncompressed. That is what lets a reader
   * identify the file from its first thirty bytes without unzipping it, and
   * some readers refuse the file outright when it is missing.
   */
  return zipSync({
    mimetype: [strToU8("application/vnd.oasis.opendocument.text"), { level: 0 }],
    "META-INF/manifest.xml": strToU8(MANIFEST),
    "styles.xml": strToU8(STYLES),
    "content.xml": strToU8(content),
  });
}
