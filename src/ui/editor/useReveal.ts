"use client";

import { useEffect, type RefObject } from "react";

/**
 * Brings the editor block for the selected path into view, and puts the caret
 * in it.
 *
 * Clicking a line on the page selects it, and the matching control can be
 * anywhere in a panel several screens tall. Highlighting it without scrolling
 * to it means the click appears to do nothing, which is what people reported:
 * they clicked a bullet, the page highlighted it, and the panel carried on
 * showing whatever it was showing.
 *
 * Timing is the awkward part. The control often does not exist yet at the
 * moment the path changes, because selecting an entry also expands its
 * accordion, and while that is animating the element is present but has no
 * height. Scrolling to a zero-height element lands in the wrong place, so this
 * waits for the block to actually occupy space before moving.
 */

/** Roughly 400ms at 60fps, comfortably past the accordion transition. */
const MAX_FRAMES = 24;

export function useReveal(
  selectedPath: string | null,
  host: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!selectedPath) return;
    const root = host.current;
    if (!root) return;

    let cancelled = false;
    let frames = 0;

    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    const tick = () => {
      if (cancelled) return;

      const el = root.querySelector<HTMLElement>(
        `[data-path="${CSS.escape(selectedPath)}"]`,
      );

      // Present but still collapsed: wait rather than scroll to a bad spot.
      if (!el || el.getBoundingClientRect().height === 0) {
        if (frames++ < MAX_FRAMES) requestAnimationFrame(tick);
        return;
      }

      el.scrollIntoView({
        // "nearest" moves the panel only when the block is actually off
        // screen, so clicking through visible fields does not jerk the list.
        block: "nearest",
        behavior: smooth ? "smooth" : "auto",
      });

      /*
       * Focus the control so the next keystroke edits the thing that was just
       * clicked. preventScroll, because the browser's own focus scrolling
       * ignores the smooth behaviour above and fights it.
       */
      const field = el.matches("input, textarea")
        ? el
        : el.querySelector<HTMLElement>("input, textarea");
      if (field && document.activeElement !== field) {
        field.focus({ preventScroll: true });
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [selectedPath, host]);
}
