/**
 * Chrome and shared building blocks for the content routes.
 *
 * SiteNav, SiteFooter and NavMenu are absent on purpose: PageShell is the only thing that
 * renders the chrome. The stylesheet is imported directly, since a barrel cannot re-export
 * CSS.
 *
 * The checker is not here either. It lives in @/ui/checker with its own dark stylesheet and
 * its own picker, and shares nothing with these beyond the shell it sits in.
 */
export { DemoCard, DemoPane } from "./DemoCard";
export { Band, PageShell, SectionHead } from "./PageShell";
export { ParseList, type ParseField } from "./ParseList";
export { ScrollReveal } from "./ScrollReveal";
export { Words } from "./Words";
