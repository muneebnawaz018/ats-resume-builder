import { describe, expect, it } from "vitest";
import { extractDocx } from "@/extract/docx";
import { extractOdt } from "@/extract/odt";
import { extractRtf } from "@/extract/rtf";
import { extractText } from "@/extract/text";
import { toResume } from "@/extract/toResume";
import { createSampleResume, zResume } from "@/schema";
import { toDocx } from "./docx";
import { toLines, stem } from "./model";
import { toOdt } from "./odt";
import { toRtf } from "./rtf";
import { toMarkdown, toPlainText } from "./text";

/**
 * Every writer is checked by reading its output back with the matching
 * extractor. A resume that cannot survive our own parser has no business
 * being handed to somebody else's.
 */
const RESUME = createSampleResume("r_test", "2026-01-01T00:00:00.000Z");

const NAME = "Alex Mercer";
const EMAIL = "alex.mercer@example.com";
const ORG = "Northwind Payments";
const BULLET = "Rebuilt the settlement pipeline";

describe("the shared reading", () => {
  it("puts the name first and the contact line above the sections", () => {
    const kinds = toLines(RESUME).map((l) => l.kind);
    expect(kinds[0]).toBe("name");
    expect(kinds.indexOf("contact")).toBeLessThan(kinds.indexOf("heading"));
  });

  it("skips hidden sections", () => {
    const hidden = {
      ...RESUME,
      sections: RESUME.sections.map((s) => ({ ...s, visible: false })),
    };
    // The summary is part of basics, not a section, so its heading stays.
    const headings = toLines(hidden)
      .filter((l) => l.kind === "heading")
      .map((l) => l.text);
    expect(headings).toEqual(["Summary"]);
  });

  it("names the file after the person", () => {
    expect(stem(RESUME)).toBe("alex-mercer");
    expect(stem({ ...RESUME, basics: { ...RESUME.basics, fullName: "" } })).toBe(
      "untitled-resume",
    );
  });
});

describe("docx", () => {
  const out = toDocx(RESUME);

  it("reads back through our own Word extractor", () => {
    const e = extractDocx(out);
    expect(e.text).toContain(NAME);
    expect(e.text).toContain(EMAIL);
    expect(e.text).toContain(ORG);
    expect(e.text).toContain(BULLET);
  });

  it("produces none of the structures the checker warns about", () => {
    const e = extractDocx(out);
    expect(e.flags).toEqual([]);
    expect(e.blocks.some((b) => b.kind === "cell")).toBe(false);
    expect(e.blocks.some((b) => b.kind === "textbox")).toBe(false);
    expect(e.blocks.some((b) => b.kind === "header")).toBe(false);
  });

  it("carries real heading styles", () => {
    const headings = extractDocx(out)
      .blocks.filter((b) => b.kind === "heading")
      .map((b) => b.text);
    expect(headings).toContain("EXPERIENCE");
    expect(headings).toContain(NAME);
  });

  it("marks bullets as list items rather than faking them with a dash", () => {
    const e = extractDocx(out);
    expect(e.blocks.some((b) => b.kind === "listItem")).toBe(true);
    expect(e.text).not.toContain("- Rebuilt");
  });

  it("round-trips back into an editable document", () => {
    const back = toResume(extractDocx(out), "export.docx");
    expect(back.basics.fullName).toBe(NAME);
    expect(back.basics.email).toBe(EMAIL);
    expect(back.sections.some((s) => s.type === "experience")).toBe(true);
    expect(zResume.safeParse(back).success).toBe(true);
  });
});

describe("odt", () => {
  const out = toOdt(RESUME);

  it("reads back through our own OpenDocument extractor", () => {
    const e = extractOdt(out);
    expect(e.text).toContain(NAME);
    expect(e.text).toContain(EMAIL);
    expect(e.text).toContain(BULLET);
    expect(e.flags).toEqual([]);
  });

  it("keeps the mimetype entry first and uncompressed", () => {
    // The signature has to be readable without inflating anything: "PK",
    // then the local header, then the literal bytes at offset 30.
    const head = new TextDecoder().decode(out.slice(0, 80));
    expect(head).toContain("mimetype");
    expect(head).toContain("application/vnd.oasis.opendocument.text");
  });

  it("round-trips back into an editable document", () => {
    const back = toResume(extractOdt(out), "export.odt");
    expect(back.basics.fullName).toBe(NAME);
    expect(zResume.safeParse(back).success).toBe(true);
  });
});

describe("rtf", () => {
  const out = toRtf(RESUME);

  it("reads back through our own RTF extractor", () => {
    const e = extractRtf(out);
    expect(e.text).toContain(NAME);
    expect(e.text).toContain(EMAIL);
    expect(e.text).toContain(BULLET);
  });

  it("escapes non-ASCII rather than emitting raw bytes", () => {
    const accented = {
      ...RESUME,
      basics: { ...RESUME.basics, fullName: "Anaïs Renaud — Engineer" },
    };
    const text = toRtf(accented);
    expect(text).not.toContain("ï");
    expect(text).toContain("\\u239?");
    expect(text).toContain("\\u8212?");
    expect(extractRtf(text).text).toContain("Anaïs Renaud — Engineer");
  });

  it("keeps the font table out of the recovered text", () => {
    expect(extractRtf(out).text).not.toContain("Calibri");
  });
});

describe("plain text", () => {
  const out = toPlainText(RESUME);

  it("reads back with sections intact", () => {
    const e = extractText(out, false);
    expect(e.text).toContain(NAME);
    expect(e.text).toContain(EMAIL);
    expect(
      e.blocks.filter((b) => b.kind === "heading").map((b) => b.text),
    ).toContain("EXPERIENCE");
    expect(e.blocks.some((b) => b.kind === "listItem")).toBe(true);
  });

  it("round-trips back into an editable document", () => {
    const back = toResume(extractText(out, false), "export.txt");
    expect(back.basics.fullName).toBe(NAME);
    expect(back.sections.some((s) => s.type === "skills")).toBe(true);
    expect(zResume.safeParse(back).success).toBe(true);
  });

  it("never runs three blank lines together", () => {
    expect(out).not.toMatch(/\n{3}/);
  });
});

describe("markdown", () => {
  const out = toMarkdown(RESUME);

  it("uses real headings", () => {
    expect(out).toContain(`# ${NAME}`);
    expect(out).toContain("## Experience");
  });

  it("reads back with the emphasis stripped", () => {
    const e = extractText(out, true);
    expect(e.text).toContain(NAME);
    expect(e.text).not.toContain("**");
    expect(e.text).toContain(BULLET);
  });
});
