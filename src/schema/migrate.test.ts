import { describe, expect, it } from "vitest";
import { createSampleResume, plainText, richText } from "@/schema";
import { loadResume } from "./migrate";

/**
 * Documents saved before the extractor stripped bullet glyphs still carry
 * "• " inside the text, which rendered as a double bullet. Loading repairs
 * them; these pin that down.
 */
describe("loadResume bullet repair", () => {
  const withBullets = (bullets: string[]) => {
    const resume = createSampleResume("r-test", "2026-01-01T00:00:00.000Z");
    const section = resume.sections.find((s) => s.type === "experience");
    if (!section) throw new Error("sample has no experience section");
    (section.items[0] as { bullets: unknown }).bullets = bullets.map(richText);
    return { resume, section };
  };

  it("strips a leading bullet glyph from stored text", () => {
    const { resume } = withBullets(["• Led development teams."]);
    const loaded = loadResume(JSON.parse(JSON.stringify(resume)));
    const item = loaded.sections.find((s) => s.type === "experience")!
      .items[0] as { bullets: { spans: { text: string }[] }[] };
    expect(plainText(item.bullets[0])).toBe("Led development teams.");
  });

  it("drops a bullet that is only a glyph", () => {
    const { resume } = withBullets(["•", "• Real content."]);
    const loaded = loadResume(JSON.parse(JSON.stringify(resume)));
    const item = loaded.sections.find((s) => s.type === "experience")!
      .items[0] as { bullets: { spans: { text: string }[] }[] };
    expect(item.bullets).toHaveLength(1);
    expect(plainText(item.bullets[0])).toBe("Real content.");
  });

  it("leaves a leading dash alone, it can be content", () => {
    const { resume } = withBullets(["-30% latency after the rewrite."]);
    const loaded = loadResume(JSON.parse(JSON.stringify(resume)));
    const item = loaded.sections.find((s) => s.type === "experience")!
      .items[0] as { bullets: { spans: { text: string }[] }[] };
    expect(plainText(item.bullets[0])).toBe("-30% latency after the rewrite.");
  });
});
