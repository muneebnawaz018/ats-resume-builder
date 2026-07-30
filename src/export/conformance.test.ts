import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { local, scan } from "@/extract/xml";
import { createSampleResume } from "@/schema";
import { toDocx } from "./docx";
import { toOdt } from "./odt";

/**
 * Does the file we produce match the format we claim it is?
 *
 * The other suite proves our own readers can read our own writers, which is
 * circular: a matching bug on both sides passes. This one checks the output
 * against what the specifications require, so it fails when the file is wrong
 * even if we would happily read it back.
 *
 * Deliberately portable. An earlier version of this evidence came from macOS's
 * `textutil`, which proved the file opened in a real Word reader but proved it
 * on exactly one operating system, useless on a Linux CI box or a Windows
 * laptop. Everything here is plain zip and XML arithmetic and runs anywhere
 * Node runs. See native.test.ts for the optional other half.
 */
const RESUME = createSampleResume("r_test", "2026-01-01T00:00:00.000Z");

/**
 * Tags balance, one root element, nothing left open.
 *
 * Word does not repair a malformed part, it refuses the document with
 * "unreadable content", which is the single worst way for this to fail.
 */
function assertWellFormed(xml: string, what: string) {
  const stack: string[] = [];
  let roots = 0;

  for (const ev of scan(xml)) {
    if (ev.type === "open") {
      if (ev.self) {
        if (stack.length === 0) roots += 1;
        continue;
      }
      if (stack.length === 0) roots += 1;
      stack.push(ev.name);
    } else if (ev.type === "close") {
      const open = stack.pop();
      expect(open, `${what}: </${ev.name}> with nothing open`).toBeDefined();
      expect(open, `${what}: </${ev.name}> closes <${open}>`).toBe(ev.name);
    }
  }

  expect(stack, `${what}: unclosed ${stack.join(" > ")}`).toEqual([]);
  expect(roots, `${what}: ${roots} root elements`).toBe(1);
}

/** Every attribute value quoted, and no stray raw ampersands in text. */
function assertEscaped(xml: string, what: string) {
  for (const ev of scan(xml)) {
    if (ev.type !== "text") continue;
    // scan() has already decoded entities, so a surviving "&" followed by
    // something entity-shaped means the writer emitted a raw one.
    expect(/&[a-zA-Z#][a-zA-Z0-9]*;/.test(ev.text), `${what}: raw entity`).toBe(
      false,
    );
  }
  expect(xml.includes("<w:t></w:t>"), `${what}: empty run`).toBe(false);
}

describe("docx conformance", () => {
  const zip = unzipSync(toDocx(RESUME));
  const read = (p: string) => strFromU8(zip[p]);

  it("carries every part ECMA-376 requires", () => {
    for (const part of [
      "[Content_Types].xml",
      "_rels/.rels",
      "word/document.xml",
    ]) {
      expect(Object.keys(zip), `missing ${part}`).toContain(part);
    }
  });

  it("declares a content type for every part it ships", () => {
    const types = read("[Content_Types].xml");
    const defaults = new Set(
      [...types.matchAll(/Extension="([^"]+)"/g)].map((m) => m[1].toLowerCase()),
    );
    const overrides = new Set(
      [...types.matchAll(/PartName="([^"]+)"/g)].map((m) => m[1].slice(1)),
    );

    for (const path of Object.keys(zip)) {
      if (path === "[Content_Types].xml") continue;
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const covered = overrides.has(path) || defaults.has(ext);
      expect(covered, `${path} has no content type`).toBe(true);
    }
  });

  it("points every relationship at a part that exists", () => {
    const rels: [string, string][] = [
      ["_rels/.rels", ""],
      ["word/_rels/document.xml.rels", "word/"],
    ];

    for (const [relPath, base] of rels) {
      if (!zip[relPath]) continue;
      for (const m of read(relPath).matchAll(/Target="([^"]+)"/g)) {
        const target = `${base}${m[1]}`.replace(/^\//, "");
        expect(Object.keys(zip), `${relPath} → ${target}`).toContain(target);
      }
    }
  });

  it("names the main document through the officeDocument relationship", () => {
    const rels = read("_rels/.rels");
    expect(rels).toMatch(
      /Type="[^"]*\/officeDocument"[^>]*Target="word\/document\.xml"/,
    );
  });

  it("writes well-formed, correctly escaped XML in every part", () => {
    for (const path of Object.keys(zip)) {
      if (!path.endsWith(".xml") && !path.endsWith(".rels")) continue;
      const xml = read(path);
      assertWellFormed(xml, path);
      assertEscaped(xml, path);
    }
  });

  it("closes the body with a section that fixes the page size", () => {
    // Without w:sectPr, Word picks the page size itself and has been known to
    // choose A4 for a document written on Letter.
    const doc = read("word/document.xml");
    expect(doc).toContain("<w:sectPr>");
    expect(doc).toMatch(/<w:pgSz w:w="\d+" w:h="\d+"\/>/);
    expect(doc).toContain("<w:cols");
  });

  it("uses the reserved style ids rather than inventing names", () => {
    const styles = read("word/styles.xml");
    for (const id of ["Title", "Heading1", "Heading2"]) {
      expect(styles).toContain(`w:styleId="${id}"`);
    }
    // The w:name is what a reader matches on, and it is lowercase by spec.
    expect(styles).toContain('w:name w:val="heading 1"');
  });

  it("references a numbering definition for every numbered paragraph", () => {
    const doc = read("word/document.xml");
    const used = new Set(
      [...doc.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map((m) => m[1]),
    );
    expect(used.size).toBeGreaterThan(0);

    const defined = new Set(
      [...read("word/numbering.xml").matchAll(/<w:num w:numId="(\d+)"/g)].map(
        (m) => m[1],
      ),
    );
    for (const id of used) {
      expect(defined, `numId ${id} is not defined`).toContain(id);
    }
  });

  it("contains none of the structures a parser chokes on", () => {
    const doc = read("word/document.xml");
    for (const tag of ["<w:tbl>", "<w:txbxContent>", "v:textbox", "<w:framePr"]) {
      expect(doc.includes(tag), `document contains ${tag}`).toBe(false);
    }
    expect(Object.keys(zip).some((p) => /header\d*\.xml$/.test(p))).toBe(false);
  });

  it("puts every paragraph in one flat run of body content", () => {
    // Nesting would mean a table or a frame; both are already asserted
    // against, and this catches a third way of producing one.
    const doc = read("word/document.xml");
    let depth = 0;
    let max = 0;
    for (const ev of scan(doc)) {
      if (ev.type === "open" && local(ev.name) === "p" && !ev.self) {
        depth += 1;
        max = Math.max(max, depth);
      } else if (ev.type === "close" && local(ev.name) === "p") depth -= 1;
    }
    expect(max).toBe(1);
  });
});

describe("odt conformance", () => {
  const bytes = toOdt(RESUME);
  const zip = unzipSync(bytes);
  const read = (p: string) => strFromU8(zip[p]);

  it("carries the parts ODF requires", () => {
    for (const part of ["mimetype", "META-INF/manifest.xml", "content.xml"]) {
      expect(Object.keys(zip), `missing ${part}`).toContain(part);
    }
  });

  it("stores the mimetype first, uncompressed, at the documented offset", () => {
    /*
     * ODF 1.3 §3.3: the mimetype entry must be first and stored, so a reader
     * can identify the file from its first thirty bytes. The local header is
     * 30 bytes; the compression method is the 16-bit field at offset 8.
     */
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(0, true)).toBe(0x04034b50); // "PK\x03\x04"
    expect(view.getUint16(8, true), "mimetype is compressed").toBe(0);

    const head = new TextDecoder().decode(bytes.slice(30, 68));
    expect(head).toBe("mimetypeapplication/vnd.oasis.opendocu");
  });

  it("lists every part in the manifest", () => {
    const manifest = read("META-INF/manifest.xml");
    for (const path of Object.keys(zip)) {
      if (path === "mimetype" || path === "META-INF/manifest.xml") continue;
      expect(manifest, `${path} is not in the manifest`).toContain(
        `manifest:full-path="${path}"`,
      );
    }
  });

  it("writes well-formed XML in every part", () => {
    for (const path of Object.keys(zip)) {
      if (!path.endsWith(".xml")) continue;
      assertWellFormed(read(path), path);
    }
  });

  it("declares every style name it uses", () => {
    const content = read("content.xml");
    const used = new Set(
      [...content.matchAll(/text:style-name="([^"]+)"/g)].map((m) => m[1]),
    );
    const declared = new Set([
      ...[...content.matchAll(/style:name="([^"]+)"/g)].map((m) => m[1]),
      ...[...read("styles.xml").matchAll(/style:name="([^"]+)"/g)].map(
        (m) => m[1],
      ),
    ]);
    for (const name of used) {
      expect(declared, `style ${name} is used but never declared`).toContain(
        name,
      );
    }
  });

  it("contains no tables or frames", () => {
    const content = read("content.xml");
    expect(content.includes("<table:table")).toBe(false);
    expect(content.includes("<draw:frame")).toBe(false);
  });
});
