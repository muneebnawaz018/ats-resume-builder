import { describe, expect, it } from "vitest";
import { extractText } from "./text";
import { recoverFields } from "./fields";
import { scoreExtraction } from "./score";
import { analyseStructure, classifyHeading, dateStyle } from "./structure";

/**
 * Structural checks, driven from plain text.
 *
 * Text is the format with the least of its own machinery in the way, so a
 * failure here is a failure in the analysis rather than in an extractor. The
 * container formats get their own fixtures in extract.test.ts.
 */
const read = (body: string) => extractText(body, false);
const analyse = (body: string) => analyseStructure(read(body));
const score = (body: string) => {
  const e = read(body);
  return scoreExtraction(e, recoverFields(e));
};

const labels = (body: string) => score(body).deductions.map((d) => d.label);

/** A resume with nothing wrong with it, to vary one thing at a time against. */
const CLEAN = `Alex Mercer
alex.mercer@example.com | +1 415 555 0142 | linkedin.com/in/amercer

EXPERIENCE

Senior Backend Engineer, Northwind Systems
March 2021 - Present
- Cut checkout latency from 840ms to 210ms.

Backend Engineer, Bellweather Data
June 2018 - February 2021
- Migrated 14 services off a shared database.

EDUCATION

BSc Computer Science, Fictional University
September 2014 - June 2017

SKILLS

Go, PostgreSQL, Kafka, Terraform
`;

describe("heading classification", () => {
  it("maps the names parsers are built to recognise", () => {
    expect(classifyHeading("EXPERIENCE")).toBe("experience");
    expect(classifyHeading("Work Experience")).toBe("experience");
    expect(classifyHeading("Employment History:")).toBe("experience");
    expect(classifyHeading("Technical Skills")).toBe("skills");
  });

  it("maps a compound heading to the section it contains", () => {
    // Parsers match on substrings too. Being stricter than they are would
    // invent failures that do not happen.
    expect(classifyHeading("Work Experience & Projects")).toBe("experience");
  });

  it("refuses the ones it does not know", () => {
    expect(classifyHeading("Where I've Made an Impact")).toBeNull();
    expect(classifyHeading("My Journey So Far")).toBeNull();
  });
});

describe("date styles", () => {
  it("tells the three shapes apart", () => {
    expect(dateStyle("March 2021")).toBe("monthYear");
    expect(dateStyle("03/2021")).toBe("numeric");
    expect(dateStyle("2021")).toBe("yearOnly");
  });
});

describe("a clean document", () => {
  it("raises no structural finding", () => {
    const s = analyse(CLEAN);
    expect(s.missingCore).toEqual([]);
    expect(s.unmapped).toEqual([]);
    expect(s.undatedEntries).toEqual([]);
    expect(s.orphanEntries).toEqual([]);
    expect(s.dateStyles).toEqual(["monthYear"]);
    expect(s.ongoingWording).toBeNull();
    expect(s.openEnded).toBe(false);
  });

  it("does not report the candidate's own name as a section heading", () => {
    // "Alex Mercer" is heading-styled in most exports, and sits above every
    // section. Reporting it as an unrecognised section name is true and
    // useless.
    expect(analyse(CLEAN).unmapped).not.toContain("Alex Mercer");
  });

  it("finds the employer when it shares the title line", () => {
    // "Senior Backend Engineer, Northwind Systems" is the commonest shape a
    // resume uses for an entry, and reading only the lines below it reported
    // every one of them as having no employer.
    const entries = analyse(CLEAN).entries;
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries.every((e) => e.hasOrg)).toBe(true);
  });
});

describe("the single-match loophole", () => {
  it("charges for an undated job even when the document has dates", () => {
    /*
     * The hole this whole module exists to close. `fields.ts` asks whether the
     * document contains a date range; this asks whether each position does.
     * Four dated jobs and one undated one used to answer "yes, dates" and
     * score as though nothing were wrong.
     */
    const body = CLEAN.replace("June 2018 - February 2021\n", "");
    const s = analyse(body);
    expect(s.undatedEntries.map((e) => e.title)).toEqual([
      "Backend Engineer, Bellweather Data",
    ]);
    expect(labels(body)).toContain("An entry with no dates");

    // And the document-level field still passes, which is the point.
    const dates = recoverFields(read(body)).find((f) => f.key === "dates");
    expect(dates?.value).not.toBeNull();
  });

  it("scores an undated job below the same document with dates", () => {
    const body = CLEAN.replace("June 2018 - February 2021\n", "");
    expect(score(body).value).toBeLessThan(score(CLEAN).value);
  });
});

describe("sections", () => {
  it("charges for a renamed work history and names the heading", () => {
    const body = CLEAN.replace("EXPERIENCE", "WHERE I'VE MADE AN IMPACT");
    const s = analyse(body);
    expect(s.missingCore).toContain("experience");

    const finding = score(body).deductions.find(
      (d) => d.label === "No work history section",
    );
    expect(finding).toBeDefined();
    expect(finding!.detail).toContain("WHERE I'VE MADE AN IMPACT");
  });

  it("charges for an unmapped heading beside sections that do map", () => {
    const body = CLEAN.replace("SKILLS", "WHAT I'M GOOD AT");
    expect(labels(body)).toContain("Headings a parser will not map");
  });
});

describe("dates", () => {
  it("charges for two formats in one document", () => {
    const body = CLEAN.replace("June 2018 - February 2021", "06/2018 - 02/2021");
    const s = analyse(body);
    expect(s.dateStyles.length).toBeGreaterThan(1);
    expect(labels(body)).toContain("Mixed date formats");
  });

  it("charges for an ongoing role written as anything but Present", () => {
    const body = CLEAN.replace("March 2021 - Present", "March 2021 - Current");
    expect(analyse(body).ongoingWording).toBe("current");
    expect(labels(body)).toContain("Ongoing role not marked Present");
  });

  it("says nothing when Present is used properly", () => {
    expect(labels(CLEAN)).not.toContain("Ongoing role not marked Present");
  });
});

describe("weights", () => {
  it("marks every structural weight as our judgement, not a citation", () => {
    const body = CLEAN.replace("EXPERIENCE", "WHERE I'VE MADE AN IMPACT");
    const structural = score(body).deductions.filter(
      (d) => d.label === "No work history section",
    );
    expect(structural).toHaveLength(1);
    expect(structural[0].basis.judged).toBe(true);
    expect(structural[0].basis.url).toBeUndefined();
  });

  it("counts a document with several structural faults as risky", () => {
    const body = CLEAN.replace("EXPERIENCE", "WHERE I'VE MADE AN IMPACT")
      .replace("June 2018 - February 2021", "06/2018 - 02/2021")
      .replace("March 2021 - Present", "March 2021 - Current");
    const s = score(body);
    expect(s.value).toBeLessThan(70);
    expect(s.band === "risky" || s.band === "broken").toBe(true);
  });
});
