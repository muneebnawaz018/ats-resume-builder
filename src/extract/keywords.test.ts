import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MIN_POSTING_TERMS, matchKeywords } from "./keywords";
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

/*
 * A posting is not a flat bag of words: it has a requirements list and a
 * wishlist. Missing one from each is not the same event, and ranking by
 * frequency alone buried the term that actually disqualifies someone under
 * several that did not.
 */
describe("how hard the posting asks", () => {
  it("separates what is required from what is a bonus", () => {
    const r = matchKeywords(POSTING, "Go and PostgreSQL.");
    const by = Object.fromEntries(r.terms.map((t) => [t.term, t.emphasis]));
    expect(by.kubernetes).toBe("required");
    expect(by.terraform).toBe("required");
    expect(by.graphql).toBe("preferred");
  });

  it("reads a requirement that was wrapped across two lines", () => {
    // Pasted postings are hard-wrapped, so "…Terraform is" and "required."
    // arrive on separate lines. Reading line by line called this a mention.
    const wrapped = matchKeywords(
      "Experience with Terraform is\nrequired.",
      "nothing here",
    );
    expect(wrapped.terms.find((t) => t.term === "terraform")?.emphasis).toBe(
      "required",
    );
  });

  it("does not offer the cue words themselves as terms", () => {
    const found = matchKeywords(POSTING, "").terms.map((t) => t.term);
    for (const cue of ["required", "familiarity", "plus", "must"]) {
      expect(found).not.toContain(cue);
    }
  });

  it("puts required terms above merely frequent ones", () => {
    const r = matchKeywords(POSTING, "");
    const firstMentioned = r.terms.findIndex((t) => t.emphasis === "mentioned");
    const lastRequired = r.terms.map((t) => t.emphasis).lastIndexOf("required");
    expect(lastRequired).toBeLessThan(firstMentioned);
  });

  it("counts required coverage on its own", () => {
    const r = matchKeywords(POSTING, "I use Terraform daily.");
    expect(r.requiredTotal).toBe(2);
    expect(r.requiredMatched).toBe(1);
  });

  it("lists what to add first, hardest requirement leading", () => {
    const r = matchKeywords(POSTING, "Go and PostgreSQL only.");
    expect(r.priority[0].emphasis).toBe("required");
    // A term present under another name is a rewording job, not an addition.
    expect(r.priority.every((t) => t.found === 0 && !t.nearMiss)).toBe(true);
  });

  it("keeps a bullet's own cue over the heading above it", () => {
    const r = matchKeywords(
      "Requirements:\n- Go\n- Kubernetes is a plus\n",
      "nothing",
    );
    const by = Object.fromEntries(r.terms.map((t) => [t.term, t.emphasis]));
    expect(by.go).toBe("required");
    expect(by.kubernetes).toBe("preferred");
  });
});

describe("demands that are not keywords", () => {
  it("surfaces a years-of-experience requirement", () => {
    const r = matchKeywords("You must have 5+ years of backend work.", "x");
    const years = r.demands.find((d) => d.kind === "experience");
    expect(years?.text).toContain("5");
    expect(years?.emphasis).toBe("required");
  });

  it("surfaces a degree and a seniority level", () => {
    const r = matchKeywords(
      "Requirements:\nBachelor degree in Computer Science\nSenior engineer role",
      "x",
    );
    expect(r.demands.some((d) => d.kind === "education")).toBe(true);
    expect(r.demands.some((d) => d.kind === "seniority")).toBe(true);
  });

  it("says nothing when the posting makes no such demand", () => {
    expect(matchKeywords("We use Go and Kafka.", "x").demands).toEqual([]);
  });
});

/*
 * A pasted word is not a job posting. Reporting on one produced arithmetic on
 * nothing: "1 of 1 terms", and a stuffing warning, because a resume says a
 * word more often than a one-word posting does.
 */
describe("refusing a posting that is not one", () => {
  it("will not report on a single word", () => {
    const r = matchKeywords(
      "testing",
      "Testing. Testing. Testing. Testing. Testing. Testing.",
    );
    expect(r.usable).toBe(false);
    // The matching still ran; it is the reporting that holds back. The
    // stuffing warning is the one figure that was actively wrong, so it is
    // suppressed at the source rather than left to the caller.
    expect(r.overused).toEqual([]);
  });

  it("will not report on a job title pasted on its own", () => {
    expect(matchKeywords("Senior Backend Engineer", RESUME).usable).toBe(false);
  });

  it("will not be fooled by one word repeated", () => {
    // Bigrams from a repeated word would otherwise pad the count past the bar.
    expect(matchKeywords("testing testing testing testing", "x").usable).toBe(
      false,
    );
  });

  it("accepts a real posting", () => {
    const r = matchKeywords(POSTING, RESUME);
    expect(r.usable).toBe(true);
    expect(r.terms.length).toBeGreaterThan(MIN_POSTING_TERMS);
  });

  it("accepts a short but genuine requirements list", () => {
    const r = matchKeywords(
      "Requirements: Go, Kubernetes, PostgreSQL, Terraform, Kafka, Docker, gRPC, Redis.",
      "Go and Kafka.",
    );
    expect(r.usable).toBe(true);
  });
});
