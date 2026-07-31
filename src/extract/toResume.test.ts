import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { zResume, type ExperienceItem, type SkillGroup } from "@/schema";
import { extractDocx } from "./docx";
import { extractText } from "./text";
import { toResume } from "./toResume";

const FIXTURES = join(process.cwd(), "testing");
const bytes = (rel: string) => new Uint8Array(readFileSync(join(FIXTURES, rel)));
const text = (rel: string) => readFileSync(join(FIXTURES, rel), "utf8");

const NOW = "2026-01-01T00:00:00.000Z";

describe("toResume", () => {
  it("produces a document the schema accepts", () => {
    const e = extractText(text("txt/clean-sections.txt"), false);
    const parsed = zResume.safeParse(toResume(e, "clean-sections.txt", NOW));
    expect(parsed.success).toBe(true);
  });

  it("recovers the basics from the block above the first heading", () => {
    const e = extractText(text("txt/clean-sections.txt"), false);
    const r = toResume(e, "resume.txt", NOW);
    expect(r.basics.fullName).toBe("Alex Mercer");
    expect(r.basics.email).toBe("alex.mercer@example.com");
    expect(r.basics.phone).toBe("+1 415 555 0142");
  });

  it("names the document after the file it came from", () => {
    const e = extractText(text("txt/clean-sections.txt"), false);
    expect(toResume(e, "alex-mercer-resume.txt", NOW).name).toBe(
      "alex-mercer-resume",
    );
  });

  it("builds experience entries with structured dates", () => {
    const e = extractText(text("txt/clean-sections.txt"), false);
    const r = toResume(e, "resume.txt", NOW);
    const exp = r.sections.find((s) => s.type === "experience");
    expect(exp).toBeDefined();

    const first = exp?.items[0] as ExperienceItem;
    expect(first.role).toBe("Senior Backend Engineer");
    expect(first.start).toEqual({ year: 2021, month: 3 });
    expect(first.end).toBe("present");
    expect(first.bullets.length).toBeGreaterThan(0);
  });

  it("closes a finished role before starting the next", () => {
    const e = extractText(text("txt/clean-sections.txt"), false);
    const exp = toResume(e, "r.txt", NOW).sections.find(
      (s) => s.type === "experience",
    );
    const second = exp?.items[1] as ExperienceItem;
    expect(second.start).toEqual({ year: 2018, month: 6 });
    expect(second.end).toEqual({ year: 2021, month: 2 });
  });

  it("splits a skills line into separate entries", () => {
    const e = extractText(text("txt/clean-sections.txt"), false);
    const skills = toResume(e, "r.txt", NOW).sections.find(
      (s) => s.type === "skills",
    );
    const group = skills?.items[0] as SkillGroup;
    expect(group.items).toEqual([
      "Go",
      "PostgreSQL",
      "Kafka",
      "Terraform",
      "AWS",
    ]);
  });

  it("reads education", () => {
    const e = extractText(text("txt/clean-sections.txt"), false);
    const edu = toResume(e, "r.txt", NOW).sections.find(
      (s) => s.type === "education",
    );
    expect(edu?.items).toHaveLength(1);
  });

  it("works from a Word file as well as a text one", () => {
    const e = extractDocx(bytes("docx/clean-styled.docx"));
    const r = toResume(e, "clean-styled.docx", NOW);
    expect(r.basics.fullName).toBe("Alex Mercer");
    expect(r.sections.some((s) => s.type === "experience")).toBe(true);
    expect(r.sections.some((s) => s.type === "skills")).toBe(true);
    expect(zResume.safeParse(r).success).toBe(true);
  });

  it("keeps unplaceable text instead of dropping it", () => {
    // Prose with no headings at all: everything is above the first section,
    // so all of it has to survive as the summary.
    const e = extractText(text("txt/unstructured-prose.txt"), false);
    const r = toResume(e, "prose.txt", NOW);
    const summary = r.basics.summary?.spans.map((s) => s.text).join("") ?? "";
    expect(summary).toContain("Cut median checkout latency");
    expect(zResume.safeParse(r).success).toBe(true);
  });

  it("survives a file with no recoverable text", () => {
    const empty = { depth: "text" as const, blocks: [], text: "", flags: [] };
    const r = toResume(empty, "scan.pdf", NOW);
    expect(r.basics.fullName).toBe("");
    expect(r.sections).toEqual([]);
    expect(zResume.safeParse(r).success).toBe(true);
  });
});

/**
 * These pin down text that the importer used to destroy outright. Each one
 * comes from a real imported resume where the content was in the PDF and
 * missing from the editor.
 */
describe("toResume does not lose header content", () => {
  const head = (...lines: string[]) =>
    toResume(
      {
        depth: "layout" as const,
        flags: [],
        text: lines.join("\n"),
        blocks: lines.map((text) => ({ kind: "paragraph" as const, text })),
      },
      "resume.pdf",
      NOW,
    );

  it("keeps every address, not just the first", () => {
    const r = head(
      "Muneeb Faisal",
      "Senior Engineer",
      "linkedin.com/in/muneebfaisal | github.com/muneeb | muneeb.dev",
    );
    expect(r.basics.links.map((l) => l.url)).toEqual([
      "linkedin.com/in/muneebfaisal",
      "github.com/muneeb",
      "muneeb.dev",
    ]);
  });

  it("labels each address by where it points", () => {
    const r = head("Muneeb Faisal", "linkedin.com/in/m | github.com/m | m.dev");
    expect(r.basics.links.map((l) => l.label)).toEqual([
      "LinkedIn",
      "GitHub",
      "Website",
    ]);
    expect(r.basics.links.map((l) => l.platform)).toEqual([
      "linkedin",
      "github",
      "website",
    ]);
  });

  it("does not repeat one address twice", () => {
    const r = head("Muneeb Faisal", "github.com/m", "github.com/m");
    expect(r.basics.links).toHaveLength(1);
  });

  it("keeps the city off the contact line", () => {
    // The whole line used to be dropped because it also carried an email.
    const r = head(
      "Muneeb Faisal",
      "Senior Engineer",
      "muneeb@example.com | +92 300 1234567 | Lahore, Pakistan",
    );
    expect(r.basics.location).toBe("Lahore, Pakistan");
    expect(r.basics.email).toBe("muneeb@example.com");
  });

  it("does not mistake the city for the summary", () => {
    const r = head("Muneeb Faisal", "muneeb@example.com | Lahore, Pakistan");
    const summary = r.basics.summary?.spans.map((s) => s.text).join("") ?? "";
    expect(summary).not.toContain("Pakistan");
  });
});

describe("toResume groups an employer with its role", () => {
  const experience = (...lines: [string, string][]) => {
    const blocks = [
      { kind: "heading" as const, text: "Experience" },
      ...lines.map(([kind, text]) => ({
        kind: kind as "paragraph" | "listItem",
        text,
      })),
    ];
    const r = toResume(
      {
        depth: "layout" as const,
        flags: [],
        text: blocks.map((b) => b.text).join("\n"),
        blocks,
      },
      "resume.pdf",
      NOW,
    );
    return (r.sections.find((s) => s.type === "experience")?.items ??
      []) as ExperienceItem[];
  };

  it("reads a company line above the title as one entry", () => {
    const items = experience(
      ["paragraph", "WalQalum Technologies:"],
      ["paragraph", "Full Stack Software Engineer: NOV 2020 - OCT 2023"],
      ["listItem", "Built the mobile app."],
    );
    expect(items).toHaveLength(1);
    expect(items[0].organization).toBe("WalQalum Technologies");
    expect(items[0].role).toBe("Full Stack Software Engineer");
    expect(items[0].start).toEqual({ year: 2020, month: 11 });
  });

  it("starts a new entry at the next company", () => {
    const items = experience(
      ["paragraph", "WalQalum Technologies:"],
      ["paragraph", "Full Stack Engineer: NOV 2020 - OCT 2023"],
      ["listItem", "Built the mobile app."],
      ["paragraph", "AMCO IT Systems:"],
      ["paragraph", "Associate Engineer: JAN 2020 - NOV 2020"],
      ["listItem", "Built internal tools."],
    );
    expect(items.map((i) => i.organization)).toEqual([
      "WalQalum Technologies",
      "AMCO IT Systems",
    ]);
  });

  it("does not split on a sub-heading inside a job", () => {
    // "React Native Development:" ends in a colon like a company does, but
    // nothing with a date follows it, so it belongs to the job it sits in.
    const items = experience(
      ["paragraph", "WalQalum Technologies:"],
      ["paragraph", "Full Stack Engineer: NOV 2020 - OCT 2023"],
      ["paragraph", "React Native Development:"],
      ["listItem", "Shipped to both app stores."],
    );
    expect(items).toHaveLength(1);
    expect(items[0].bullets.map((b) => b.spans[0].text)).toContain(
      "React Native Development:",
    );
  });

  it("does not invent an empty bullet", () => {
    // The company line used to produce an entry of its own whose only bullet
    // was empty, which rendered as a lone glyph on the page.
    const items = experience(
      ["paragraph", "WalQalum Technologies:"],
      ["paragraph", "Full Stack Engineer: NOV 2020 - OCT 2023"],
    );
    expect(items[0].bullets).toEqual([]);
  });
});
