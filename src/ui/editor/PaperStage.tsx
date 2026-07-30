"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ResumeDocument, lengthToCss } from "@/render";
import { type Resume, type Theme } from "@/schema";
import css from "./PaperStage.module.css";

/**
 * Page height in CSS pixels at 96dpi. Used only to draw page-break guides.
 *
 * The browser paginates for real at print time, see the pagination decision
 * in docs/03-architecture.md. These guides are an approximation shown to the
 * user, which is why they are drawn in the non-printing guide colour.
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
  onSelect: (path: string) => void;
  onPageCount?: (pages: number) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [breaks, setBreaks] = useState<number[]>([]);
  const [sheetHeight, setSheetHeight] = useState(0);
  const pageHeight = PAGE_PX[theme.tokens.pageSize];
  const pageWidth = PAGE_WIDTH_PX[theme.tokens.pageSize];

  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.scrollHeight;
      setSheetHeight(h);
      const count = Math.max(1, Math.ceil(h / pageHeight));
      setBreaks((prev) => {
        const next = Array.from(
          { length: count - 1 },
          (_, i) => (i + 1) * pageHeight,
        );
        // Avoid a state write per observer tick, which would loop.
        return prev.length === next.length ? prev : next;
      });
      onPageCount?.(count);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [resume, theme, pageHeight, onPageCount]);

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
    <div className={css.stage} data-print-flow>
      <div
        className={css.zoomOuter}
        data-print-flow
        style={{ width: pageWidth * zoom, height: sheetHeight * zoom }}
      >
        <p className={css.hint}>Click any part of the page to edit it.</p>
        <div
          className={css.zoomer}
          data-print-flow
          style={{ transform: `scale(${zoom})`, width: pageWidth }}
        >
          <div ref={sheetRef} className={css.sheet}>
            <ResumeDocument resume={resume} theme={theme} onSelect={onSelect} />

            <div
              className={css.guidesInner}
              aria-hidden="true"
              style={{
                top: lengthToCss(t.marginTop),
                right: lengthToCss(t.marginRight),
                bottom: lengthToCss(t.marginBottom),
                left: lengthToCss(t.marginLeft),
              }}
            />
            {breaks.map((top, i) => (
              <div key={i} className={css.pageBreak} style={{ top }}>
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
