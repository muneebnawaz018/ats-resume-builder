import type { ReactNode } from "react";
import { SiteFooter } from "@/ui/site/SiteFooter";
import { SiteNav } from "@/ui/site/SiteNav";
import css from "@/ui/site/site.module.css";

/**
 * Scroll container, header, footer — the frame every content page sits in.
 *
 * `data-scroller` marks this as the element that scrolls: the page is not the
 * window, which the sticky-header and anchor-offset code both depend on.
 */
export function PageShell({
  nav,
  footer = "full",
  children,
}: {
  nav: "home" | "check" | "other";
  footer?: "full" | "bar";
  children: ReactNode;
}) {
  return (
    <div className={css.page} data-scroller>
      <SiteNav current={nav} />
      {children}
      <SiteFooter variant={footer} />
    </div>
  );
}

/** A full-bleed horizontal band, optionally tinted, with an anchor target. */
export function Band({
  id,
  tint = false,
  children,
}: {
  id?: string;
  tint?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${css.band} ${tint ? css.bandTint : ""}`} id={id}>
      <div className={css.wrap}>{children}</div>
    </div>
  );
}

/** Kicker, heading and intro — the block that opens a section. */
export function SectionHead({
  kicker,
  title,
  intro,
}: {
  kicker: string;
  title: string;
  intro?: string;
}) {
  return (
    <div className={`${css.sectionHead} reveal`}>
      <p className={css.kicker}>{kicker}</p>
      <h2 className={css.h2}>{title}</h2>
      {intro ? <p className={css.sectionIntro}>{intro}</p> : null}
    </div>
  );
}
