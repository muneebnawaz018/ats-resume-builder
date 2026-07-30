import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchKeywords } from "./keywords";
import { extractText } from "./text";

const RESUME = readFileSync(
  join(process.cwd(), "testing", "txt", "clean-sections.txt"),
  "utf8",
);

const POSTING = `
Senior Backend Engineer

We are looking for a backend engineer to join a fast-paced team. You will
build distributed systems in Go, own PostgreSQL schema design, and work with
Kafka for event streaming. Experience with Kubernetes and Terraform is
required. Familiarity with GraphQL is a plus.

Responsibilities:
- Design and build backend services in Go
- Operate PostgreSQL at scale
- Own Kafka pipelines
`;

const terms = (text: string) =>
  matchKeywords(POSTING, text).terms.map((t) => t.term);

describe("keyword matching", () => {
  it("pulls real terms out of a posting and skips the boilerplate", () => {
    const found = terms(RESUME);
    expect(found).toContain("go");
    expect(found).toContain("postgresql");
    expect(found).toContain("kafka");

    for (const noise of ["team", "experience", "responsibilities", "looking"]) {
      expect(found).not.toContain(noise);
    }
  });

  it("marks a term the resume has and one it does not", () => {
    const report = matchKeywords(POSTING, RESUME);
    const byTerm = Object.fromEntries(report.terms.map((t) => [t.term, t.found]));

    // The fixture resume lists Go, PostgreSQL, Kafka, Terraform and AWS.
    expect(byTerm.terraform).toBeGreaterThan(0);
    // It says nothing about Kubernetes or GraphQL.
    expect(byTerm.kubernetes ?? 0).toBe(0);
  });

  it("keeps two-word phrases together", () => {
    const report = matchKeywords(
      "We need machine learning experience and model deployment skills.",
      "I have machine learning experience.",
    );
    expect(report.terms.map((t) => t.term)).toContain("machine learning");

    // The resume mentions neither word of "model deployment".
    const deployment = report.terms.find((t) => t.term === "model deployment");
    expect(deployment?.found ?? 0).toBe(0);
  });

  it("does not count two unrelated words as a phrase match", () => {
    const report = matchKeywords(
      "Looking for machine learning expertise.",
      "I fixed the coffee machine. I enjoy learning.",
    );
    const phrase = report.terms.find((t) => t.term === "machine learning");
    expect(phrase?.found).toBe(0);
  });

  it("collapses plurals so APIs matches API", () => {
    const report = matchKeywords(
      "Build and document APIs for internal services.",
      "Designed an API used by four teams.",
    );
    // Displayed as written in the posting ("apis"), matched by stem.
    const api = report.terms.find((t) => t.term.startsWith("api"));
    expect(api?.found).toBeGreaterThan(0);
  });

  it("keeps technology names that contain punctuation", () => {
    const report = matchKeywords(
      "Strong C++ and .NET background, plus CI/CD ownership.",
      "Ten years of C++ and CI/CD work.",
    );
    const found = report.terms.map((t) => t.term);
    expect(found).toContain("c++");
    expect(found).toContain("ci/cd");
    expect(report.terms.find((t) => t.term === ".net")?.found).toBe(0);
  });

  it("reports coverage as a fraction of the terms it listed", () => {
    const report = matchKeywords(POSTING, RESUME);
    expect(report.coverage).toBeGreaterThan(0);
    expect(report.coverage).toBeLessThanOrEqual(1);
    expect(report.coverage).toBeCloseTo(report.matched / report.terms.length);
  });

  it("flags stuffing rather than rewarding it", () => {
    const stuffed = `${RESUME}\nKubernetes Kubernetes Kubernetes Kubernetes Kubernetes Kubernetes Kubernetes`;
    const report = matchKeywords(POSTING, stuffed);
    expect(report.overused).toContain("kubernetes");
  });

  it("reports an abbreviation as a near miss, not a match", () => {
    const report = matchKeywords(
      "You will own our Kubernetes clusters.",
      "Ran K8s clusters for three years.",
    );
    const term = report.terms.find((t) => t.term === "kubernetes");
    // The ATS matches literal text, so counting this would flatter the number
    // with something the system will not credit.
    expect(term?.found).toBe(0);
    expect(term?.nearMiss).toBe("k8s");
    expect(report.nearMisses.map((t) => t.term)).toContain("kubernetes");
  });

  it("leaves coverage untouched by near misses", () => {
    const report = matchKeywords(
      "You will own our Kubernetes clusters.",
      "Ran K8s clusters for three years.",
    );
    expect(report.coverage).toBeCloseTo(report.matched / report.terms.length);
    expect(report.matched).toBe(report.terms.filter((t) => t.found > 0).length);
  });

  it("expands in both directions", () => {
    const written = matchKeywords("We need a Sr. Engineer.", "Senior Engineer.");
    expect(written.terms.find((t) => t.term === "sr")?.nearMiss).toBe("senior");
  });

  it("surfaces every reading of an ambiguous abbreviation and picks none", () => {
    // Telling a project manager to call themselves a product manager is how a
    // tool loses trust, so PM stays a near miss whichever expansion is present.
    const report = matchKeywords(
      "Hiring a PM for the payments team.",
      "Project manager on payments.",
    );
    const pm = report.terms.find((t) => t.term === "pm");
    expect(pm?.found).toBe(0);
    expect(pm?.nearMiss).toBe("project manager");
  });

  it("returns an empty report for an empty posting", () => {
    const report = matchKeywords("", RESUME);
    expect(report.terms).toEqual([]);
    expect(report.coverage).toBe(0);
  });

  it("reads a resume through the extractor, not just as raw text", () => {
    const extracted = extractText(RESUME, false);
    const report = matchKeywords(POSTING, extracted.text);
    expect(report.matched).toBeGreaterThan(0);
  });
});
