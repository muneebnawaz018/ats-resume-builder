import { describe, expect, it } from "vitest";
import { detectLetterSpacing, MIN_RUN } from "./letterspacing";

describe("letter-spaced text", () => {
  it("finds a spaced-out heading", () => {
    const r = detectLetterSpacing("S O F T W A R E   E N G I N E E R");
    expect(r.longest).toBeGreaterThanOrEqual(MIN_RUN);
    expect(r.sample).toContain("S O F T");
    expect(r.share).toBe(1);
  });

  it("leaves initials alone", () => {
    // Every token here is two characters, so no run can start.
    expect(detectLetterSpacing("J. R. R. Tolkien").longest).toBe(0);
  });

  it("leaves ordinary short words alone", () => {
    expect(detectLetterSpacing("I am a developer and I write code").longest).toBe(0);
  });

  it("does not fire on three single letters in a row", () => {
    // Three is reachable honestly. Four is not.
    expect(detectLetterSpacing("grade A B C results").longest).toBe(0);
  });

  it("ignores spaced digits, which are dates and lists", () => {
    expect(detectLetterSpacing("1 2 3 4 5 6").longest).toBe(0);
  });

  it("scales with how much of the document is affected", () => {
    // Roughly the token count of a real one-page resume, so the heading is the
    // small share of the document it would be in practice.
    const body = "Built and shipped backend services for a payments team. ".repeat(50);
    const headingOnly = detectLetterSpacing(`E X P E R I E N C E\n${body}`);
    const throughout = detectLetterSpacing(
      "E X P E R I E N C E S K I L L S E D U C A T I O N",
    );
    expect(headingOnly.share).toBeLessThan(0.05);
    expect(throughout.share).toBeGreaterThan(0.2);
  });

  it("says nothing about an empty document", () => {
    expect(detectLetterSpacing("")).toEqual({ share: 0, longest: 0, sample: null });
  });
});
