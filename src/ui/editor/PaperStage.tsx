"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ResumeDocument, lengthToCss } from "@/render";
import { type Resume, type Theme } from "@/schema";
import { lengthToPx, paginateSheet } from "./paginate";
import css from "./PaperStage.module.css";

/**
 * Page size in CSS pixels at 96dpi.
 *
 * These are the same lengths the print engine uses (8.5in = 816px exactly, by
 * CSS definition), which is what lets the editor lay pages out itself and
 * have the exported PDF break in the same places. See paginate.ts.
 */
const PAGE_PX = { Letter: 11 * 96, A4: (297 / 25.4) * 96 } as const;
const PAGE_WIDTH_PX = { Letter: 8.5 * 96, A4: (210 / 25.4) * 96 } as const;

function PaperStageInner({
  resume,
  theme,
  zoom,
  selectedPath,
  onSelect,
  onPageCount,
}: {
  resume: Resume;
  theme: Theme;
  zoom: number;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  onPageCount?: (pages: number) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const pageHeight = PAGE_PX[theme.tokens.pageSize];
  const pageWidth = PAGE_WIDTH_PX[theme.tokens.pageSize];
  const marginTopPx = lengthToPx(theme.tokens.marginTop);
  const marginBottomPx = lengthToPx(theme.tokens.marginBottom);

  /*
   * Lay the document out into real pages: any line that would straddle a
   * page boundary is pushed below the next page's top margin. The observer
   * re-runs it when something reflows behind React's back (a web font
   * arriving); the height guard stops observer events caused by the
   * pagination itself from looping.
   */
  const settledHeight = useRef(-1);
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const doc = sheet?.querySelector("article");
    if (!sheet || !(doc instanceof HTMLElement)) return;

    const run = () => {
      const res = paginateSheet(doc, {
        pageHeight,
        marginTop: marginTopPx,
        marginBottom: marginBottomPx,
      });
      settledHeight.current = res.height;
      setPages(res.pages);
      onPageCount?.(res.pages);
    };

    run();
    const ro = new ResizeObserver(() => {
      if (Math.abs(doc.offsetHeight - settledHeight.current) > 1) run();
    });
    ro.observe(doc);
    return () => ro.disconnect();
  }, [resume, theme, pageHeight, marginTopPx, marginBottomPx, onPageCount]);

  // Selection highlight is a class toggle, not a re-render of the document.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    el.querySelectorAll("[data-path].isSelected").forEach((n) =>
      n.classList.remove("isSelected"),
    );
    if (!selectedPath) return;
    el.querySelector(`[data-path="${CSS.escape(selectedPath)}"]`)?.classList.add(
      "isSelected",
    );
  }, [selectedPath, resume]);

  const t = theme.tokens;

  return (
    <div
      className={css.stage}
      data-print-flow
      /*
       * Clicking the desk around the page clears the selection. Without this
       * the last thing clicked stays outlined and the panel stays parked on
       * it, with no way to say "nothing, thanks" short of picking something
       * else. mousedown rather than click, so the outline goes at the moment
       * the press lands rather than a beat later.
       */
      onMouseDown={(e) => {
        if (!sheetRef.current?.contains(e.target as Node)) onSelect(null);
      }}
    >
      <div
        className={css.zoomOuter}
        data-print-flow
        style={{ width: pageWidth * zoom, height: pages * pageHeight * zoom }}
      >
        <p className={css.hint}>Click any part of the page to edit it.</p>
        <div
          className={css.zoomer}
          data-print-flow
          style={{ transform: `scale(${zoom})`, width: pageWidth }}
        >
          {/* min-height rounds the sheet up to whole pages, so the last page
              is full-size paper rather than ending where the text does. */}
          <div
            ref={sheetRef}
            className={css.sheet}
            style={{ minHeight: pages * pageHeight }}
          >
            <ResumeDocument resume={resume} theme={theme} onSelect={onSelect} />

            {Array.from({ length: pages }, (_, i) => (
              <div
                key={i}
                className={css.guidesInner}
                aria-hidden="true"
                style={{
                  top: i * pageHeight + marginTopPx,
                  height: pageHeight - marginTopPx - marginBottomPx,
                  right: lengthToCss(t.marginRight),
                  left: lengthToCss(t.marginLeft),
                }}
              />
            ))}
            {Array.from({ length: pages - 1 }, (_, i) => (
              <div
                key={i}
                className={css.pageBreak}
                style={{ top: (i + 1) * pageHeight - 11 }}
              >
                <span className={css.pageBreakLabel}>page {i + 2}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Memoised: typing in the inspector must not re-render the document unless
 *  the document actually changed. */
export const PaperStage = memo(PaperStageInner);
