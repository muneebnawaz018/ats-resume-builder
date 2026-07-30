"use client";

import type { ThemeTokens } from "@/schema";

/**
 * Tells the print engine what paper the document was designed for.
 *
 * Without this the export takes whatever the print dialog defaults to, which
 * is A4 in most of the world and Letter in the US. The page size token then
 * only affected the preview, so someone who chose Letter and printed on a
 * machine defaulting to A4 got 8.5 inches of content on an 8.27 inch sheet:
 * the browser scales it down to fit, and every margin and type size comes out
 * smaller than it was set. Silently, and differently per user.
 *
 * A generated style element rather than a rule in the stylesheet, because
 * `@page` does not read custom properties in any engine that ships today, so
 * the value cannot come from the theme through CSS alone.
 *
 * The margin stays at zero: the document draws its own margins, and letting
 * the printer add more would double them.
 */
export function PrintPageSize({
  pageSize,
}: {
  pageSize: ThemeTokens["pageSize"];
}) {
  const size = pageSize === "A4" ? "A4" : "letter";
  return (
    <style>{`@media print { @page { size: ${size}; margin: 0; } }`}</style>
  );
}
