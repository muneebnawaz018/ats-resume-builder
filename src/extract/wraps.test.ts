import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdf, wraps, type LineGeom } from "./pdf";

/**
 * A PDF stores glyphs at coordinates and has no idea what a paragraph is, so
 * a bullet that wrapped over three visual lines arrives as three unrelated
 * runs. Emitting each as its own block shredded real resumes: one bullet
 * reached the editor as three fragments, cut mid-clause.
 */

const BODY = 11;
/** The right-hand edge lines wrap at. */
const MEASURE = 540;

const line = (over: Partial<LineGeom> = {}): LineGeom => ({
  text: "some ordinary body text",
  left: 72,
  right: MEASURE,
  y: 600,
  kind: "paragraph",
  ...over,
});

describe("deciding whether a line wrapped", () => {
  it("joins a line that ran out of room", () => {
    expect(wraps(line(), line({ y: 584 }), MEASURE, BODY)).toBe(true);
  });

  it("leaves a line that stopped short of the measure", () => {
    // A job title or the last line of a paragraph ends well before the edge.
    const short = line({ right: 300 });
    expect(wraps(short, line({ y: 584 }), MEASURE, BODY)).toBe(false);
  });

  it("allows the ragged edge one word of slack", () => {
    // Wrapped text ends wherever the next word did not fit, never flush.
    const nearly = line({ right: MEASURE - 45 });
    expect(wraps(nearly, line({ y: 584 }), MEASURE, BODY)).toBe(true);
  });

  it("does not join across a paragraph break", () => {
    // Twice the leading is a new paragraph, not a continuation.
    expect(wraps(line(), line({ y: 560 }), MEASURE, BODY)).toBe(false);
  });

  it("starts a new block at a bullet, however full the line above", () => {
    for (const marker of ["• Built a service", "- Built", "3. Built", "* Built"]) {
      expect(wraps(line(), line({ y: 584, text: marker }), MEASURE, BODY)).toBe(
        false,
      );
    }
  });

  it("starts a new block at a finished sentence followed by a capital", () => {
    // Bullets are often set without a glyph; the full stop is all there is.
    const ended = line({ text: "...cut latency to 210ms." });
    const next = line({ y: 584, text: "Led the migration of 14 services." });
    expect(wraps(ended, next, MEASURE, BODY)).toBe(false);
  });

  it("keeps wrapping mid-sentence, where the comma proves it", () => {
    const ended = line({ text: "...split tabs, ordering, loyalty," });
    const next = line({ y: 584, text: "memberships, ticketing, plus an App Clip." });
    expect(wraps(ended, next, MEASURE, BODY)).toBe(true);
  });

  it("never joins across a column gutter", () => {
    // A tab marks a gap wide enough to be a gutter: the right edge belongs to
    // the far column and says nothing about wrapping.
    const roleAndDates = line({ text: "Senior Engineer\tMar 2021" });
    expect(wraps(roleAndDates, line({ y: 584 }), MEASURE, BODY)).toBe(false);
    expect(wraps(line(), line({ y: 584, text: "a\tb" }), MEASURE, BODY)).toBe(
      false,
    );
  });

  it("ignores headings on either side", () => {
    expect(
      wraps(line({ kind: "heading" }), line({ y: 584 }), MEASURE, BODY),
    ).toBe(false);
    expect(
      wraps(line(), line({ y: 584, kind: "heading" }), MEASURE, BODY),
    ).toBe(false);
  });

  it("does not join a line that starts somewhere else entirely", () => {
    // A continuation sits at the paragraph's left edge or its hanging indent.
    expect(wraps(line(), line({ y: 584, left: 260 }), MEASURE, BODY)).toBe(false);
    // A hanging indent under a bullet is still the same paragraph.
    expect(wraps(line(), line({ y: 584, left: 84 }), MEASURE, BODY)).toBe(true);
  });
});

describe("rejoining wrapped lines in a real document", () => {
  const nodePdfjs = async () =>
    (await import("pdfjs-dist/legacy/build/pdf.mjs")) as never;
  const read = (rel: string) =>
    new Uint8Array(readFileSync(join(process.cwd(), "testing", rel)));

  it("puts a bullet split over three lines back together", async () => {
    const e = await extractPdf(read("pdf/wrapped-lines.pdf"), nodePdfjs);
    const bullet = e.blocks.find((b) => b.text.startsWith("- Rebuilt"));
    expect(bullet?.text).toContain("cutting end-to-end reconciliation");
    expect(bullet?.text).toContain("every payment corridor.");
    // The fragments must not also survive as blocks of their own.
    expect(e.blocks.filter((b) => b.text.startsWith("cutting"))).toHaveLength(0);
  });

  it("keeps a short bullet out of the one above it", async () => {
    const e = await extractPdf(read("pdf/wrapped-lines.pdf"), nodePdfjs);
    expect(e.blocks.some((b) => b.text === "- Mentored four engineers.")).toBe(
      true,
    );
  });

  it("rejoins a wrapped skills line", async () => {
    const e = await extractPdf(read("pdf/wrapped-lines.pdf"), nodePdfjs);
    const skills = e.blocks.find((b) => b.text.startsWith("Frontend:"));
    expect(skills?.text).toContain("Tailwind CSS");
    expect(skills?.text).toContain("Ant Design and i18n");
  });

  it("does not glue a job title to its dates", async () => {
    // The regression this nearly caused: on a sparse page the widest line is
    // a job title, which made every title look like it had run out of room.
    const e = await extractPdf(read("pdf/two-pages.pdf"), nodePdfjs);
    const role = e.blocks.find((b) => b.text.startsWith("Senior Backend"));
    expect(role?.text).toBe("Senior Backend Engineer, Northwind Systems");
  });

  it("does not merge two columns into one sentence", async () => {
    const e = await extractPdf(read("pdf/two-column-layout.pdf"), nodePdfjs);
    expect(e.flags.some((f) => f.kind === "multiColumn")).toBe(true);
    expect(e.blocks.some((b) => b.text.startsWith("CONTACT"))).toBe(true);
  });
});
