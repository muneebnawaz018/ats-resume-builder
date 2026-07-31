import { describe, expect, it } from "vitest";
import {
  classifyLink,
  linkText,
  normaliseLinkInput,
  platformById,
  WEBSITE_PLATFORM,
} from "./links";

describe("classifyLink", () => {
  it("recognises a destination through any scheme or www prefix", () => {
    expect(classifyLink("https://www.linkedin.com/in/alex").id).toBe("linkedin");
    expect(classifyLink("linkedin.com/in/alex").id).toBe("linkedin");
    expect(classifyLink("http://github.com/alex").id).toBe("github");
  });

  it("treats twitter and x as the same place", () => {
    expect(classifyLink("twitter.com/alex").id).toBe("x");
    expect(classifyLink("x.com/alex").id).toBe("x");
  });

  it("falls back to a personal site rather than nothing", () => {
    expect(classifyLink("alexmercer.dev").id).toBe(WEBSITE_PLATFORM.id);
  });

  it("does not match a host that merely contains the name", () => {
    // "notlinkedin.com" and "linkedin.com.evil.example" are not LinkedIn.
    expect(classifyLink("notlinkedin.com/in/alex").id).toBe("website");
    expect(classifyLink("mylinkedin.com/x").id).toBe("website");
  });
});

describe("normaliseLinkInput", () => {
  const github = platformById("github")!;

  it("expands a bare handle into a full address", () => {
    expect(normaliseLinkInput("alex", github)).toBe("github.com/alex");
    expect(normaliseLinkInput("@alex", github)).toBe("github.com/alex");
  });

  it("leaves an address that is already one alone", () => {
    expect(normaliseLinkInput("github.com/alex", github)).toBe("github.com/alex");
    expect(normaliseLinkInput("https://github.com/alex/", github)).toBe(
      "github.com/alex",
    );
  });

  it("returns nothing for nothing", () => {
    expect(normaliseLinkInput("   ", github)).toBe("");
  });
});

describe("linkText", () => {
  const link = { label: "LinkedIn", url: "linkedin.com/in/alex" };

  it("prints the address by default", () => {
    expect(linkText({ ...link, displayAs: "url" })).toBe("linkedin.com/in/alex");
  });

  it("prints both when asked, so the address still survives extraction", () => {
    expect(linkText({ ...link, displayAs: "both" })).toBe(
      "LinkedIn: linkedin.com/in/alex",
    );
  });

  it("prints the label alone only when there is one", () => {
    expect(linkText({ ...link, displayAs: "label" })).toBe("LinkedIn");
    // No label to fall back on: the address is better than an empty space.
    expect(linkText({ ...link, label: "", displayAs: "label" })).toBe(
      "linkedin.com/in/alex",
    );
  });

  it("does not print a stray separator when there is no label", () => {
    expect(linkText({ ...link, label: "", displayAs: "both" })).toBe(
      "linkedin.com/in/alex",
    );
  });
});
