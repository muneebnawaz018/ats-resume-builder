import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractDocx } from "./docx";
import { extractPdf } from "./pdf";
import { extractText } from "./text";
import { recoverFields } from "./fields";
import { FLAG_COSTS, scoreExtraction } from "./score";

const FIXTURES = join(process.cwd(), "testing");
const bytes = (rel: string) => new Uint8Array(readFileSync(join(FIXTURES, rel)));
const text = (rel: string) => readFileSync(join(FIXTURES, rel), "utf8");

const nodePdfjs = async () =>
  (await import("pdfjs-dist/legacy/build/pdf.mjs")) as never;

const score = (e: Parameters<typeof recoverFields>[0]) =>
  scoreExtraction(e, recoverFields(e));

describe("scoring", () => {
  it("rates a clean document highly, but never at 100", () => {
    const s = score(extractText(text("txt/clean-sections.txt"), false));
    expect(s.value).toBeGreaterThanOrEqual(85);
    expect(s.band).toBe("clean");
    // No parser is guaranteed and none publish their rules, so the ceiling is
    // 98. A perfect score would be a claim about software we cannot see.
    expect(s.value).toBeLessThanOrEqual(98);
  });

  it("declares where every weight came from", () => {
    /*
     * The contract is not "every weight is cited", which was never true: the
     * column cost and the oversize cost have always been judgement calls. It
     * is that a weight says which it is. A cited one links to the vendor or
     * paper that documents the failure; a judged one carries the reasoning
     * instead and is never rendered beside somebody else's link.
     */
    const s = score(extractDocx(bytes("docx/contact-in-textbox.docx")));
    expect(s.deductions.length).toBeGreaterThan(0);
    for (const d of s.deductions) {
      expect(d.basis.source.length).toBeGreaterThan(8);
      expect(d.basis.claim.length).toBeGreaterThan(30);
      if (d.basis.judged) {
        expect(d.basis.url).toBeUndefined();
        expect(d.basis.source).toMatch(/judgement/i);
      } else {
        expect(d.basis.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("collects the citations without repeating them", () => {
    const s = score(extractDocx(bytes("docx/contact-in-textbox.docx")));
    const keys = s.sources.map((b) => b.url + b.claim);
    expect(new Set(keys).size).toBe(keys.length);
    for (const d of s.deductions) {
      expect(keys).toContain(d.basis.url + d.basis.claim);
    }
  });

  it("charges for the documented 2.5MB parse limit", () => {
    const e = extractText(text("txt/clean-sections.txt"), false);
    const under = scoreExtraction(e, recoverFields(e), 2 * 1024 * 1024);
    const over = scoreExtraction(e, recoverFields(e), 3 * 1024 * 1024);
    expect(over.value).toBeLessThan(under.value);
    expect(over.deductions.some((d) => d.label === "File size")).toBe(true);
    // Greenhouse is the vendor that documents the limit, so it must be the
    // one cited.
    const sized = over.deductions.find((d) => d.label === "File size");
    expect(sized?.basis.url).toContain("greenhouse.io");
  });

  it("weights a vendor-documented structural fault above a missing date", () => {
    // Greenhouse names text boxes explicitly; the measurement data says dates
    // are read reliably when present.
    const boxed = score(extractDocx(bytes("docx/contact-in-textbox.docx")));
    const undated = score(extractText("SUMMARY\nBackend engineer.\n", false));

    const box = boxed.deductions.find((d) => d.label === "Text box")?.cost;
    const dates = undated.deductions.find((d) => d.label === "Missing dates")?.cost;
    expect(box).toBeDefined();
    expect(dates).toBeDefined();
    expect(box!).toBeGreaterThan(dates!);
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
    // One finding for one defect: the column layout is what scrambles the
    // reading order, so both detectors feed a single deduction.
    const layout = score(columns).deductions.filter(
      (d) => d.label === "Column layout and reading order",
    );
    expect(layout).toHaveLength(1);
    expect(layout[0].triggeredBy?.length).toBeGreaterThan(0);
    for (const kind of layout[0].triggeredBy ?? []) {
      expect(["multiColumn", "readingOrder"]).toContain(kind);
    }
  });

  it("names the checks a format cannot fail instead of passing them", () => {
    const plain = score(extractText(text("txt/clean-sections.txt"), false));
    expect(plain.skipped).toContain("Column layout");

    /*
     * Word is not a layout format. It can be checked for tables, text boxes
     * and header content, and it cannot be checked for reading order, columns
     * or a missing text layer, so those three are named rather than passed.
     */
    const word = score(extractDocx(bytes("docx/clean-styled.docx")));
    expect(word.skipped).toEqual([
      "Reading order",
      "Column layout",
      "Text layer",
    ]);
    expect(word.skipped).not.toContain("Tables");
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
    const product = s.deductions.reduce((acc, d) => acc * (1 - d.cost / 100), 98);
    expect(s.value).toBe(Math.round(product));
    for (const d of s.deductions) {
      expect(d.detail.length).toBeGreaterThan(20);
    }
  });

  it("keeps responding to fixes however broken the document is", () => {
    // The old subtractive model clipped at zero, so on a bad enough resume a
    // real fix moved the score from 0 to 0 and the user concluded it did
    // nothing. Removing any finding must raise the number, at every depth.
    const worst = score(extractDocx(bytes("docx/contact-in-textbox.docx")));
    expect(worst.deductions.length).toBeGreaterThan(1);

    const valueOf = (ds: typeof worst.deductions) =>
      Math.round(ds.reduce((acc, d) => acc * (1 - d.cost / 100), 98));

    for (let i = 0; i < worst.deductions.length; i += 1) {
      const fixed = worst.deductions.filter((_, j) => j !== i);
      if (worst.deductions[i].cost === 0) continue;
      expect(valueOf(fixed)).toBeGreaterThan(valueOf(worst.deductions));
    }
  });

  it("never goes negative, whatever fires", () => {
    const every = Object.values(FLAG_COSTS).map((f) => ({
      label: f.label,
      cost: f.cost,
      severity: "high" as const,
      detail: "x",
      basis: f.basis,
    }));
    const value = Math.round(
      every.reduce((acc, d) => acc * (1 - d.cost / 100), 98),
    );
    expect(value).toBeGreaterThanOrEqual(0);
  });
});

describe("formats the ATS will not accept", () => {
  const clean = () => extractText(text("txt/clean-sections.txt"), false);

  it("blocks a format Greenhouse does not take", () => {
    const e = clean();
    const s = scoreExtraction(e, recoverFields(e), undefined, ".md");
    expect(s.blockers).toHaveLength(1);
    expect(s.blockers[0].label).toContain(".md");
    expect(s.blockers[0].detail).toMatch(/pdf|docx/i);
  });

  it("keeps the blocker out of the score", () => {
    const e = clean();
    const scored = scoreExtraction(e, recoverFields(e), undefined, ".md");
    const unscored = scoreExtraction(e, recoverFields(e), undefined, ".pdf");
    // The content advice is the same either way, and still worth having: it
    // survives the re-export the blocker is asking for.
    expect(scored.value).toBe(unscored.value);
    expect(scored.deductions).toEqual(unscored.deductions);
  });

  it("passes the formats it does take", () => {
    const e = clean();
    for (const ext of [".pdf", ".docx", ".rtf", ".txt"]) {
      expect(scoreExtraction(e, recoverFields(e), undefined, ext).blockers).toEqual(
        [],
      );
    }
  });

  it("says nothing when the extension is unknown", () => {
    const e = clean();
    expect(scoreExtraction(e, recoverFields(e)).blockers).toEqual([]);
  });
});

describe("severity, which is what the UI shows instead of the weights", () => {
  it("labels every deduction", () => {
    const s = score(extractDocx(bytes("docx/contact-in-textbox.docx")));
    for (const d of s.deductions) {
      expect(["blocking", "high", "medium", "low"]).toContain(d.severity);
    }
  });

  it("ranks severity in the same order as the hidden weights", () => {
    const order = { blocking: 0, high: 1, medium: 2, low: 3 } as const;
    const s = score(extractDocx(bytes("docx/layout-table.docx")));
    const ranks = s.deductions.map((d) => order[d.severity]);
    // Sorted by cost already, so severity must be non-decreasing. If it is
    // not, a threshold and a weight have drifted apart.
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("calls an unreadable file blocking", async () => {
    const e = await extractPdf(bytes("pdf/no-text-layer.pdf"), nodePdfjs);
    expect(score(e).deductions[0].severity).toBe("blocking");
  });
});
