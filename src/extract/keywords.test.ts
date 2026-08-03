import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MIN_POSTING_TERMS, matchKeywords } from "./keywords";
import { tokens, words } from "./keywords/words";
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
 * English text is not ASCII text. Every case here is something an English
 * resume contains, and against the old `[a-z0-9]` token every one of them
 * broke at the accent: "Zoë Muñoz" tokenised as ["zo", "mu", "oz"].
 */
describe("accents", () => {
  const matchOne = (posting: string, resume: string) =>
    matchKeywords(posting, resume).terms.find((t) => t.found > 0);

  it("keeps an accented word whole", () => {
    const r = matchKeywords(
      `Requirements: strong Kubernetes and Terraform. You will work on the
       Nestlé account alongside a résumé parsing team in São Paulo, and own
       the Go services behind it end to end.`,
      "Ran the Nestlé account. Built résumé parsing in Go.",
    );
    // Whole, accent kept for display, and credited as found in the resume.
    expect(r.terms.find((t) => t.term === "nestlé account")?.found).toBe(1);
    expect(r.terms.find((t) => t.term === "résumé parsing")?.found).toBe(1);
    expect(r.terms.map((t) => t.term)).toContain("são paulo");
  });

  it("matches an accented word against its unaccented spelling", () => {
    // The posting and the resume disagree about the accent, not the employer.
    expect(matchOne("We are hiring for the Nestlé account.", "Nestle")).toBeDefined();
    expect(matchOne("We are hiring for the Nestle account.", "Nestlé")).toBeDefined();
  });

  it("reads an accented capital as a name", () => {
    // Only a capital separates a name from an ordinary word in plain text, and
    // Å is not in A-Z.
    expect(words("worked at Ångström Labs")).toContainEqual({
      lower: "ångström",
      proper: true,
    });
  });

  it("still keeps the punctuation that belongs to a name", () => {
    expect(tokens("C++ and C# with .NET and CI/CD")).toEqual([
      "c++", "and", "c#", "with", ".net", "and", "ci/cd",
    ]);
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

  /*
   * The case the word count could not see. Typed at a keyboard and pasted six
   * times over, this clears MIN_POSTING_TERMS on distinct words alone, and the
   * report that came back named every one of them as a term the resume lacked.
   */
  it("will not report on text that is not English", () => {
    const mash = Array.from(
      { length: 6 },
      () =>
        "askdjna sdk sakjd sakd askjd kas dkas dkaj djkad jkas djkas dkjas " +
        "asdadadadadadlsak;dlasldmaslkd",
    ).join(" ");
    const r = matchKeywords(mash, RESUME);
    expect(r.usable).toBe(false);
  });

  it("accepts a long posting written as bullet fragments", () => {
    // Terse, but still English: the prose floor sits far below this.
    const r = matchKeywords(
      `Requirements:
       - Five years building backend services in Go
       - Strong PostgreSQL schema design and query tuning
       - Kafka, or another event streaming platform
       - Kubernetes in production, with Terraform for infrastructure
       - gRPC and protocol buffers
       - Docker, Redis, and CI/CD pipelines you have owned end to end`,
      RESUME,
    );
    expect(r.usable).toBe(true);
  });

  it("accepts a short but genuine requirements list", () => {
    const r = matchKeywords(
      "Requirements: Go, Kubernetes, PostgreSQL, Terraform, Kafka, Docker, gRPC, Redis.",
      "Go and Kafka.",
    );
    expect(r.usable).toBe(true);
  });
});

/*
 * A posting in the shape real ones arrive in: headings in the wording people
 * actually use, a wishlist, and a tail of pay, benefits and how to apply.
 * Every case below is something this got wrong on that shape.
 */
const REALISTIC = `Software Engineer (Frontend)

What you'll do
- Build and maintain features in our React/TypeScript web app
- Write tests and review your teammates' pull requests

What we're looking for
- 2+ years writing production JavaScript or TypeScript
- Solid React experience (hooks, state management, forms)
- Comfortable with HTML and CSS, including responsive layouts
- Familiar with Git and a normal pull request workflow

Nice to have
- Next.js
- Node.js and REST API work
- Testing with Jest or Playwright

Salary: $110,000 - $140,000 depending on experience.
Benefits: health, dental, 401k match, 20 days PTO.

To apply, send a resume and a short note about something you've built.
`;

describe("a posting in its usual shape", () => {
  const report = matchKeywords(REALISTIC, "Next.js and Node.js. Tested with Jest.");
  const terms = report.terms.map((t) => t.term);

  it("reads what we're looking for as the requirements list", () => {
    // Without this heading every requirement ranked as a passing mention and
    // fell off the end, leaving the wishlist as the whole report.
    expect(report.requiredTotal).toBeGreaterThan(4);
    const required = report.terms
      .filter((t) => t.emphasis === "required")
      .map((t) => t.term);
    expect(required).toContain("react");
    expect(required).toContain("typescript");
    expect(required).toContain("git");
  });

  it("takes no terms from pay, benefits or how to apply", () => {
    // These were ranked as things to add, so the advice read "health dental",
    // "dental 401k", "401k match": tailor your resume to a dental plan.
    for (const noise of ["health", "dental", "401k", "pto", "days pto", "salary"]) {
      expect(terms).not.toContain(noise);
    }
  });

  it("does not let the wishlist heading run on to the end of the posting", () => {
    // The leak that caused the above: section emphasis persisted past its own
    // bullets, so every later line inherited "nice to have".
    expect(report.terms.every((t) => t.emphasis === "preferred")).toBe(false);
  });

  it("still reports the wishlist behind a long requirements list", () => {
    // Ranking by emphasis alone filled all 24 slots from the requirements, so
    // a resume matching three wishlist items was told it matched none.
    expect(terms).toContain("next.js");
    expect(terms).toContain("node.js");
    expect(report.matched).toBeGreaterThan(1);
  });

  it("splits a slash between two full words", () => {
    // "React/TypeScript" as one token is a term no resume contains, and it
    // meant React went uncounted.
    expect(terms).toContain("react");
    expect(terms).not.toContain("react/typescript");
  });

  it("does not offer a phrase and both its halves", () => {
    expect(terms).toContain("pull requests");
    expect(terms).not.toContain("pull");
    expect(terms).not.toContain("requests");
  });

  it("does not offer an instruction verb as a term", () => {
    // Bullets are written as instructions, so pairing adjacent words produced
    // "writing production" and "explain technical", and "write" on its own.
    // Nobody is screened on those.
    expect(terms).not.toContain("write");
    expect(terms).not.toContain("writing production");
    expect(terms).not.toContain("explain technical");
    expect(terms).not.toContain("review pull");
  });

  it("keeps a real phrase that merely ends in a verb-like word", () => {
    // Only the leading half is tested: technical writing is a job.
    const r = matchKeywords(
      "Requirements: technical writing, Python, SQL, Tableau, Excel, dbt, Airflow, Looker.",
      "Technical writing and Python.",
    );
    expect(r.terms.map((t) => t.term)).toContain("technical writing");
  });

  it("does not treat a contraction tail as a word", () => {
    expect(terms.some((t) => t.startsWith("ve "))).toBe(false);
  });
});
