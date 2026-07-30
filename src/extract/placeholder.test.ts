import { describe, expect, it } from "vitest";
import { findPlaceholders } from "./placeholder";

const hits = (text: string, values: (string | null)[] = []) =>
  findPlaceholders(text, values).hits;

describe("unfilled template text", () => {
  it("catches numbered generic employers", () => {
    expect(hits("Company 1")).toEqual(["Company 1"]);
    expect(hits("Client 2")).toEqual(["Client 2"]);
    expect(hits("employee 1")).toEqual(["employee 1"]);
  });

  it("catches bracketed and braced fields", () => {
    expect(hits("[Job Title]")).toEqual(["[Job Title]"]);
    expect(hits("{{name}}")).toEqual(["{{name}}"]);
  });

  it("catches stock names", () => {
    expect(hits("John Doe")).toEqual(["John Doe"]);
    expect(hits("First Last")).toEqual(["First Last"]);
    expect(hits("Your Name")).toEqual(["Your Name"]);
  });

  it("leaves real companies with digits alone", () => {
    // The reason the numbered patterns need a generic prefix word.
    for (const real of ["3M", "7-Eleven", "Studio 54", "Level 3 Communications"]) {
      expect(hits(real)).toEqual([]);
    }
  });

  it("does not read prose as a placeholder", () => {
    const prose =
      "I rebuilt the onboarding flow, which had shipped with lorem ipsum copy in three places, and replaced it with real content written alongside the support team.";
    expect(hits(prose)).toEqual([]);
  });

  it("checks recovered field values, not just lines", () => {
    expect(hits("", ["Company 1", null])).toEqual(["Company 1"]);
  });

  it("treats reserved contact details as advisory, never as a hit", () => {
    const r = findPlaceholders("alex@example.com\n555-555-0134\n");
    expect(r.hits).toEqual([]);
    expect(r.advisory).toHaveLength(2);
  });

  it("reports each offender once", () => {
    expect(hits("Company 1\nCompany 1\n")).toEqual(["Company 1"]);
  });
});
