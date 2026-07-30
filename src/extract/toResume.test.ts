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
