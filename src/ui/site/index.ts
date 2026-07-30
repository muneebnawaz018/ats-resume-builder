/**
 * Chrome and shared building blocks for the content routes.
 *
 * SiteNav, SiteFooter and NavMenu are absent on purpose: PageShell is the only
 * thing that renders them, and it sits next door. The stylesheet is imported
 * directly, since a barrel cannot re-export CSS.
 */
export { DemoCard, DemoPane } from "./DemoCard";
export { Band, PageShell, SectionHead } from "./PageShell";
export { ParseList, type ParseField } from "./ParseList";
export { ScrollReveal } from "./ScrollReveal";
export { Words } from "./Words";
