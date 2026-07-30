import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractDocx } from "./docx";
import { extractPdf } from "./pdf";
import { extractText } from "./text";
import { recoverFields } from "./fields";
import { scoreExtraction } from "./score";

const FIXTURES = join(process.cwd(), "testing");
const bytes = (rel: string) => new Uint8Array(readFileSync(join(FIXTURES, rel)));
const text = (rel: string) => readFileSync(join(FIXTURES, rel), "utf8");

const nodePdfjs = async () =>
  (await import("pdfjs-dist/legacy/build/pdf.mjs")) as never;

const score = (e: Parameters<typeof recoverFields>[0]) =>
  scoreExtraction(e, recoverFields(e));

describe("scoring", () => {
  it("rates a clean document highly", () => {
    const s = score(extractText(text("txt/clean-sections.txt"), false));
    expect(s.value).toBeGreaterThanOrEqual(85);
    expect(s.band).toBe("clean");
  });

  it("bottoms out on a scan", async () => {
    const e = await extractPdf(bytes("pdf/no-text-layer.pdf"), nodePdfjs);
    const s = score(e);
    expect(s.value).toBe(0);
    expect(s.band).toBe("broken");
    expect(s.deductions[0].label).toBe("No text layer");
  });

  it("charges more for a lost email than a lost portfolio link", () => {
    const e = extractText("EXPERIENCE\nEngineer\nJan 2020 - Present\n", false);
    const byLabel = Object.fromEntries(
      score(e).deductions.map((d) => [d.label, d.cost]),
    );
    expect(byLabel["Missing email"]).toBeGreaterThan(byLabel["Missing links"]);
  });

  it("lists the heaviest problem first", () => {
    const e = extractDocx(bytes("docx/contact-in-textbox.docx"));
    const costs = score(e).deductions.map((d) => d.cost);
    expect(costs).toEqual([...costs].sort((a, b) => b - a));
  });

  it("penalises a two-column PDF for its reading order", async () => {
    const clean = await extractPdf(
      bytes("pdf/clean-single-column.pdf"),
      nodePdfjs,
    );
    const columns = await extractPdf(
      bytes("pdf/two-column-layout.pdf"),
      nodePdfjs,
    );
    expect(score(columns).value).toBeLessThan(score(clean).value);
    expect(score(columns).deductions.some((d) => d.label === "Two columns")).toBe(
      true,
    );
  });

  it("names the checks a format cannot fail instead of passing them", () => {
    const plain = score(extractText(text("txt/clean-sections.txt"), false));
    expect(plain.skipped).toContain("Column layout");

    const pdfBacked = score(extractDocx(bytes("docx/clean-styled.docx")));
    expect(pdfBacked.skipped).toEqual([]);
  });

  it("never leaves the 0 to 100 range", () => {
    const empty = { depth: "text" as const, blocks: [], text: "", flags: [] };
    expect(score(empty).value).toBe(0);

    const everything = extractDocx(bytes("docx/contact-in-textbox.docx"));
    const s = score(everything);
    expect(s.value).toBeGreaterThanOrEqual(0);
    expect(s.value).toBeLessThanOrEqual(100);
  });

  it("explains every point it takes off", () => {
    const s = score(extractDocx(bytes("docx/layout-table.docx")));
    const total = s.deductions.reduce((sum, d) => sum + d.cost, 0);
    expect(s.value).toBe(Math.max(0, 100 - total));
    for (const d of s.deductions) {
      expect(d.detail.length).toBeGreaterThan(20);
    }
  });
});
