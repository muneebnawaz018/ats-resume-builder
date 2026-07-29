"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ResumeDocument } from "@/render/ResumeDocument";
import { lengthToCss } from "@/render/tokens";
import type { Resume } from "@/schema/resume";
import type { Theme } from "@/schema/theme";
import css from "./PaperStage.module.css";

/**
 * Page height in CSS pixels at 96dpi. Used only to draw page-break guides.
 *
 * The browser paginates for real at print time — see the pagination decision
 * in docs/03-architecture.md. These guides are an approximation shown to the
 * user, which is why they are drawn in the non-printing guide colour.
 */
const PAGE_PX = { Letter: 11 * 96, A4: (297 / 25.4) * 96 } as const;

export function PaperStage({
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
  const pageHeight = PAGE_PX[theme.tokens.pageSize];

  // Measure after paint so the guides reflect real laid-out height.
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.scrollHeight;
      const count = Math.max(1, Math.ceil(h / pageHeight));
      setBreaks(
        Array.from({ length: count - 1 }, (_, i) => (i + 1) * pageHeight),
      );
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
    const match = el.querySelector(
      `[data-path="${CSS.escape(selectedPath)}"]`,
    );
    match?.classList.add("isSelected");
  }, [selectedPath, resume]);

  const t = theme.tokens;

  return (
    <div className={css.stage}>
      <div className={css.zoomer} style={{ transform: `scale(${zoom})` }}>
        <p className={css.hint}>
          Click any part of the page to edit it.
        </p>
        <div ref={sheetRef} className={css.sheet}>
          <ResumeDocument resume={resume} theme={theme} onSelect={onSelect} />

          <div
            className={css.guidesInner}
            aria-hidden="true"
            title="Margin guide — never printed"
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
  );
}
