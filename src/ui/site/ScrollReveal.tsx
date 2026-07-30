"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll reveals.
 *
 * This started as pure CSS `animation-timeline: view()`, which costs no JS,
 * but support is Chromium-only and silently does nothing everywhere else, so
 * the page read as completely static. An IntersectionObserver is ~1KB and
 * behaves identically in every browser, which is worth more than the saving.
 *
 * The hiding rule is gated on `html.js`, the class is only added once this
 * runs, so if the script never executes the content is simply visible rather
 * than stuck at opacity 0.
 */
export function ScrollReveal() {
  /*
   * This lives in the root layout, which survives client-side navigation, so
   * without re-running per route, a second page's elements were never observed
   * and stayed at opacity 0. That looked like a blank band, not a missing
   * animation.
   */
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced) return;

    root.classList.add("js");

    const targets = document.querySelectorAll<HTMLElement>(
      ".reveal, .reveal-stagger > *",
    );

    // Stagger comes from position within its own group, so a row of cards
    // resolves left to right rather than as one slab.
    targets.forEach((el) => {
      const siblings = el.parentElement?.classList.contains("reveal-stagger")
        ? Array.from(el.parentElement.children)
        : null;
      const i = siblings ? siblings.indexOf(el) : 0;
      el.style.setProperty("--reveal-delay", `${Math.min(i, 8) * 70}ms`);
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target); // reveal once; re-animating on scroll-back is noise
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    targets.forEach((el) => io.observe(el));

    /*
     * The parse list plays a read-through once when it first appears: each row
     * lights in turn, top to bottom, the way an extractor walks the fields.
     * Once only, a looping animation next to body copy is an irritation.
     */
    const scanIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const rows = Array.from(e.target.children) as HTMLElement[];
          rows.forEach((r, i) =>
            r.style.setProperty("--scan-delay", `${i * 130}ms`),
          );
          e.target.classList.add("is-scanning");
          scanIo.unobserve(e.target);
        }
      },
      { threshold: 0.4 },
    );
    document
      .querySelectorAll("[data-scan]")
      .forEach((el) => scanIo.observe(el));

    /*
     * The bar tightens once you leave the top of the page. Scroll lives on the
     * page container, not the window, `.page` is the scroller.
     */
    const scroller =
      document.querySelector<HTMLElement>("[data-scroller]") ?? window;
    const onScroll = () => {
      const y =
        scroller === window
          ? window.scrollY
          : (scroller as HTMLElement).scrollTop;
      root.classList.toggle("scrolled", y > 12);
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });

    /*
     * Failsafe. Hidden-until-observed is only safe if something always reveals
     * it; anything still hidden after 2s gets shown regardless. Invisible
     * content is a far worse failure than a missing animation.
     */
    const failsafe = window.setTimeout(() => {
      targets.forEach((el) => el.classList.add("is-in"));
    }, 2000);

    return () => {
      window.clearTimeout(failsafe);
      io.disconnect();
      scanIo.disconnect();
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return null;
}
