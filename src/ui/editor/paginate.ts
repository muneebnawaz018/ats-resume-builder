import type { Length } from "@/schema";

/**
 * Real pagination for the continuous document flow.
 *
 * The document renders as one tall article. This module measures every atomic
 * line in it, finds the ones that would straddle a page boundary, and pushes
 * them (via margin-top) to the top of the next page's content area, so that
 *
 *  - nothing sits under the page seam in the editor,
 *  - every page gets its own top and bottom margin, and
 *  - the browser's print cut at each page height lands in blank paper,
 *    which makes the exported PDF match the preview exactly.
 *
 * Headings are kept with what follows them: a section title or an entry's
 * role line is pushed along rather than left stranded as the last line of a
 * page.
 */

const PX_PER_UNIT: Record<Length["unit"], number> = {
  px: 1,
  pt: 96 / 72,
  in: 96,
  mm: 96 / 25.4,
  // em never reaches page metrics; margins are physical lengths.
  em: 16,
};

export const lengthToPx = (l: Length): number => l.value * PX_PER_UNIT[l.unit];

export type PageMetrics = {
  /** Full page height in CSS px (Letter 1056, A4 ~1122.52). */
  pageHeight: number;
  /** Top margin in px, reserved on every page after the first by pushing. */
  marginTop: number;
  /** Bottom margin in px, the zone no atom may end inside. */
  marginBottom: number;
};

export type AtomBox = {
  /** Natural top, px from the document's top edge, before any pushing. */
  top: number;
  height: number;
  /** Heading-like: must not be the last thing on a page. */
  headed: boolean;
  /** True for a section title, which may precede a different item scope. */
  isSectionTitle: boolean;
  /** Identity of the entry this atom belongs to; -1 when outside any entry. */
  group: number;
};

export type Push = { index: number; delta: number };

/*
 * Sub-pixel slack. Page heights and margins are irrational in CSS px (A4 is
 * 1122.519…), and measured rects round, so an exact comparison would report a
 * line as overflowing by a hundredth of a pixel and open a page for it.
 */
const EPSILON = 0.5;

/**
 * Decides which atoms move to the next page, in document order.
 *
 * Pure so it can be tested against synthetic geometry; the DOM never enters.
 * Returns pushes expressed against the ORIGINAL indices; each push shifts
 * every later atom by its delta, which the loop tracks in `shift`.
 */
export function planBreaks(atoms: AtomBox[], m: PageMetrics): Push[] {
  const pushes: Push[] = [];
  const usable = m.pageHeight - m.marginTop - m.marginBottom;
  if (usable <= 0) return pushes;

  let shift = 0;
  for (let i = 0; i < atoms.length; i++) {
    const top = atoms[i].top + shift;
    const bottom = top + atoms[i].height;
    const page = Math.floor(top / m.pageHeight);
    const contentStart = page * m.pageHeight + m.marginTop;
    const contentEnd = (page + 1) * m.pageHeight - m.marginBottom;

    /*
     * Two ways an atom can sit wrong: it starts inside the top margin band
     * (the flow ran straight past a page boundary), or it crosses into the
     * bottom margin. The first nudges to this page's content start; the
     * second moves to the next page's. An atom taller than any page could
     * hold stays put, since pushing it would just open a blank page.
     */
    let target: number;
    if (top < contentStart - EPSILON) {
      target = contentStart;
    } else if (bottom > contentEnd + EPSILON && atoms[i].height <= usable) {
      target = (page + 1) * m.pageHeight + m.marginTop;
    } else {
      continue;
    }

    /*
     * Walk back over the headings glued to this atom. An entry's role line
     * chains to the atom below it only within the same entry; a section
     * title chains regardless, because the atom below it is by definition
     * the first thing in its section.
     */
    let first = i;
    while (first > 0) {
      const prev = atoms[first - 1];
      const attached =
        prev.headed &&
        (prev.isSectionTitle || prev.group === atoms[first].group);
      if (!attached) break;
      first--;
    }

    const chainTop = atoms[first].top + shift;
    const delta = target - chainTop;
    if (delta <= 0) continue;
    pushes.push({ index: first, delta });
    shift += delta;
  }
  return pushes;
}

/* ------------------------------------------------------------------ *
 * DOM side
 * ------------------------------------------------------------------ */

const PUSH_ATTR = "data-pg-push";

/**
 * Geometry relative to the document, in layout px.
 *
 * Client rects, not offsetTop: the offsetParent chain of a document line
 * skips the article (it is not positioned) and runs on up through the app
 * shell, so offset sums are measured from the wrong origin. Rects are
 * origin-free: subtract the document's own rect and the shell cancels out.
 * The editor zooms with a transform, which scales rects but not layout;
 * dividing by the document's own scale factor undoes it without needing the
 * zoom value passed in.
 */
type DocSpace = { top: number; scale: number };

function docSpace(doc: HTMLElement): DocSpace {
  const rect = doc.getBoundingClientRect();
  const scale = doc.offsetWidth > 0 ? rect.width / doc.offsetWidth : 1;
  return { top: rect.top, scale };
}

function topWithin(el: HTMLElement, space: DocSpace): number {
  return (el.getBoundingClientRect().top - space.top) / space.scale;
}

/**
 * The atomic lines of the document: elements that must never be cut in half
 * by a page boundary. Recursion stops at list items, at horizontal flex rows
 * (an entry's title/date line), and at anything with only inline children.
 */
function collectAtomElements(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const visit = (el: HTMLElement) => {
    if (el.tagName === "LI") {
      out.push(el);
      return;
    }
    const style = getComputedStyle(el);
    if (style.display === "flex" && style.flexDirection.startsWith("row")) {
      out.push(el);
      return;
    }
    const blockKids: HTMLElement[] = [];
    for (const child of el.children) {
      if (!(child instanceof HTMLElement)) continue;
      const d = getComputedStyle(child).display;
      if (d === "none" || d === "inline" || d.startsWith("inline-")) continue;
      blockKids.push(child);
    }
    if (blockKids.length === 0) {
      out.push(el);
      return;
    }
    for (const kid of blockKids) visit(kid);
  };
  for (const child of root.children) {
    if (child instanceof HTMLElement) visit(child);
  }
  return out;
}

const HEADING_TAGS = new Set(["H1", "H2", "H3"]);

function toAtomBoxes(
  els: HTMLElement[],
  space: DocSpace,
): { boxes: AtomBox[]; baseMargins: number[] } {
  const groups = new Map<Element, number>();
  const boxes: AtomBox[] = [];
  const baseMargins: number[] = [];

  for (const el of els) {
    const isSectionTitle = el.tagName === "H2";
    // The role/date line and the subtitle line of an entry read as headings:
    // a page must not end with them. The renderer marks them with data-headed.
    const style = getComputedStyle(el);
    const headed =
      isSectionTitle ||
      HEADING_TAGS.has(el.tagName) ||
      el.hasAttribute("data-headed");

    const scope = el.closest('[data-path*=".items["]');
    let group = -1;
    if (scope) {
      const known = groups.get(scope);
      group = known ?? groups.size;
      if (known === undefined) groups.set(scope, group);
    }

    boxes.push({
      top: topWithin(el, space),
      height: el.getBoundingClientRect().height / space.scale,
      headed,
      isSectionTitle,
      group,
    });
    baseMargins.push(parseFloat(style.marginTop) || 0);
  }
  return { boxes, baseMargins };
}

export type PaginateResult = { pages: number; height: number };

/**
 * Measures the document, plans the breaks, and applies them as inline
 * margin-top on the pushed atoms. Idempotent: previously applied pushes are
 * cleared before measuring, so repeated calls converge on the same layout.
 */
export function paginateSheet(
  doc: HTMLElement,
  m: PageMetrics,
): PaginateResult {
  for (const el of doc.querySelectorAll<HTMLElement>(`[${PUSH_ATTR}]`)) {
    el.style.marginTop = "";
    el.removeAttribute(PUSH_ATTR);
  }

  const els = collectAtomElements(doc);
  const { boxes, baseMargins } = toAtomBoxes(els, docSpace(doc));
  const pushes = planBreaks(boxes, m);

  for (const { index, delta } of pushes) {
    const el = els[index];
    el.style.marginTop = `${baseMargins[index] + delta}px`;
    el.setAttribute(PUSH_ATTR, "1");
  }

  /*
   * Margin collapsing can swallow part of a push when the pushed atom is the
   * first child of a spaced container (a bullet list's own margin-top, an
   * entry's gap). Rather than modelling the collapse rules, measure where
   * each pushed atom actually landed and absorb the residual.
   */
  const settled = docSpace(doc);
  for (const { index, delta } of pushes) {
    const el = els[index];
    const target = boxes[index].top + delta + sumEarlier(pushes, index);
    const actual = topWithin(el, settled);
    const residual = target - actual;
    if (Math.abs(residual) > 0.5) {
      el.style.marginTop = `${parseFloat(el.style.marginTop) + residual}px`;
    }
  }

  const height = doc.offsetHeight;
  const pages = Math.max(1, Math.ceil((height - 1) / m.pageHeight));
  return { pages, height };
}

/** Total shift already applied above `index` (its own delta excluded). */
function sumEarlier(pushes: Push[], index: number): number {
  let s = 0;
  for (const p of pushes) if (p.index < index) s += p.delta;
  return s;
}
