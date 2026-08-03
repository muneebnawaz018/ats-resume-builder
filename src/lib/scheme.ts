/**
 * The colour scheme: how it is stored, and how it is applied before paint.
 *
 * Two states are stored, light and dark, and the absence of a stored value is
 * the third: follow the operating system. Nothing writes "system", it is what
 * an empty key means.
 *
 * `data-theme` on <html> is the single switch. The generated stylesheet has a
 * `prefers-color-scheme` rule as well, but only as the no-JavaScript fallback:
 * once the script below runs, the attribute is always present and always wins.
 * MUI is told to key off the same attribute, so the editor cannot end up light
 * while the content routes are dark, which is exactly what happens if the two
 * layers are left to read the media query independently.
 */

export const SCHEME_KEY = "ats:scheme";

/** Applies a scheme to the document. */
export function applyScheme(scheme: "light" | "dark"): void {
  document.documentElement.setAttribute("data-theme", scheme);
}

/**
 * Run before the first paint, from a blocking inline script in <head>.
 *
 * Without this the page paints light, then React hydrates and switches it, and
 * anyone on dark gets a white flash on every navigation. Inline and blocking is
 * the only thing that beats first paint, and it is one line.
 *
 * It resolves the system preference to a literal value rather than leaving the
 * attribute off, so everything downstream has one thing to read. The OS is
 * re-read on every load and, while nothing is stored, whenever it changes: see
 * ThemeToggle.
 *
 * Wrapped in try/catch because reading localStorage throws outright in a
 * browser with cookies blocked, and a theme preference is not worth a blank
 * page.
 */
export const SCHEME_SCRIPT = `(function(){var d="light";try{var s=localStorage.getItem(${JSON.stringify(
  SCHEME_KEY,
)});d=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){}document.documentElement.setAttribute("data-theme",d)})()`;
