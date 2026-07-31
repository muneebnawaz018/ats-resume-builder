import { describe, expect, it } from "vitest";
import { lengthToPx, planBreaks, type AtomBox, type PageMetrics } from "./paginate";

/** pageHeight 1000, margins 50: page 1 content ends at 950, page 2 starts at 1050. */
const M: PageMetrics = { pageHeight: 1000, marginTop: 50, marginBottom: 50 };

const atom = (partial: Partial<AtomBox> & Pick<AtomBox, "top" | "height">): AtomBox => ({
  headed: false,
  isSectionTitle: false,
  group: -1,
  ...partial,
});

describe("planBreaks", () => {
  it("leaves a document that fits alone", () => {
    const atoms = [atom({ top: 50, height: 100 }), atom({ top: 160, height: 700 })];
    expect(planBreaks(atoms, M)).toEqual([]);
  });

  it("pushes a straddling atom below the next page's top margin", () => {
    const atoms = [
      atom({ top: 50, height: 880 }),
      atom({ top: 940, height: 40 }), // ends at 980, past the 950 content edge
    ];
    const pushes = planBreaks(atoms, M);
    expect(pushes).toEqual([{ index: 1, delta: 1050 - 940 }]);
  });

  it("an atom ending exactly at the content edge is not pushed", () => {
    const atoms = [atom({ top: 900, height: 50 })];
    expect(planBreaks(atoms, M)).toEqual([]);
  });

  it("takes an attached heading of the same entry along", () => {
    const atoms = [
      atom({ top: 900, height: 20, headed: true, group: 3 }), // role line
      atom({ top: 925, height: 50, group: 3 }), // bullet that overflows
    ];
    const pushes = planBreaks(atoms, M);
    // The chain starts at the heading, which lands at the page 2 content top.
    expect(pushes).toEqual([{ index: 0, delta: 1050 - 900 }]);
  });

  it("takes a section title along even though it sits outside the entry", () => {
    const atoms = [
      atom({ top: 880, height: 20, headed: true, isSectionTitle: true }),
      atom({ top: 905, height: 20, headed: true, group: 0 }),
      atom({ top: 930, height: 60, group: 0 }),
    ];
    const pushes = planBreaks(atoms, M);
    expect(pushes).toEqual([{ index: 0, delta: 1050 - 880 }]);
  });

  it("does not drag the previous entry's tail line across the page", () => {
    const atoms = [
      atom({ top: 890, height: 20, headed: true, group: 1 }), // prior entry's subtitle
      atom({ top: 930, height: 60, group: 2 }), // next entry's first line overflows
    ];
    const pushes = planBreaks(atoms, M);
    expect(pushes).toEqual([{ index: 1, delta: 1050 - 930 }]);
  });

  it("accounts for earlier pushes when finding later boundaries", () => {
    const atoms = [
      atom({ top: 940, height: 40 }), // pushed to 1050, shifting everything by 110
      atom({ top: 990, height: 800 }), // natural 990 -> effective 1100, fits page 2
      atom({ top: 1800, height: 200 }), // effective 1910, crosses 1950 edge
    ];
    const pushes = planBreaks(atoms, M);
    expect(pushes).toEqual([
      { index: 0, delta: 110 },
      { index: 2, delta: 2050 - 1910 },
    ]);
  });

  it("leaves an atom taller than a page where it is", () => {
    const atoms = [atom({ top: 900, height: 950 })];
    expect(planBreaks(atoms, M)).toEqual([]);
  });

  it("nudges an atom that lands inside a page's top margin band", () => {
    // Flowed straight past the boundary: starts at 1010, band is 1000..1050.
    const atoms = [atom({ top: 1010, height: 30 })];
    expect(planBreaks(atoms, M)).toEqual([{ index: 0, delta: 1050 - 1010 }]);
  });

  it("brings the heading along when its content is nudged out of the band", () => {
    const atoms = [
      atom({ top: 920, height: 20, headed: true, group: 5 }), // fits page 1
      atom({ top: 1005, height: 30, group: 5 }), // its bullet, in the band
    ];
    // The heading must not stay behind as the last line of page 1.
    expect(planBreaks(atoms, M)).toEqual([{ index: 0, delta: 1050 - 920 }]);
  });
});

describe("lengthToPx", () => {
  it("converts physical units at 96dpi", () => {
    expect(lengthToPx({ value: 1, unit: "in" })).toBe(96);
    expect(lengthToPx({ value: 72, unit: "pt" })).toBe(96);
    expect(lengthToPx({ value: 25.4, unit: "mm" })).toBeCloseTo(96);
    expect(lengthToPx({ value: 10, unit: "px" })).toBe(10);
  });
});
