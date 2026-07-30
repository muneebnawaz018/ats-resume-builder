import { type Length, type ThemeOverrides, type ThemeTokens } from "@/schema";

/**
 * Token name -> CSS custom property name.
 *
 * The whole design rests on this: tokens are written as CSS custom properties
 * on the document root, so changing one is a style recalculation rather than a
 * React re-render of resume content. Passing tokens as props would make
 * dragging a spacing slider re-render the entire document.
 */
export const cssVarName = (key: string): string =>
  `--r-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

const isLength = (v: unknown): v is Length =>
  typeof v === "object" &&
  v !== null &&
  "value" in v &&
  "unit" in v &&
  typeof (v as Length).value === "number";

export const lengthToCss = (l: Length): string => `${l.value}${l.unit}`;

/** Fallback stack so the document still sets sensibly if the face is missing. */
export function fontStack(family: string): string {
  const serif = ["Georgia", "Cambria", "Garamond", "Times New Roman", "Book Antiqua"];
  const generic = serif.includes(family) ? "serif" : "sans-serif";
  return `"${family}", ${generic}`;
}

function tokenToCss(key: string, value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (isLength(value)) return lengthToCss(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return null;

  switch (key) {
    case "fontFamily":
      return fontStack(value);
    case "headingCase":
      return value === "upper"
        ? "uppercase"
        : value === "capitalize"
          ? "capitalize"
          : "none";
    default:
      return value;
  }
}

/**
 * Values a stylesheet cannot derive from a token directly. Kept here rather
 * than in CSS so the renderer stays declarative.
 */
function derived(t: ThemeTokens): Record<string, string> {
  const base = t.fontSizeBase.value;
  const unit = t.fontSizeBase.unit;
  return {
    "--r-page-width": t.pageSize === "A4" ? "210mm" : "8.5in",
    "--r-page-height": t.pageSize === "A4" ? "297mm" : "11in",
    "--r-font-size-small": `${(base / t.typeScale).toFixed(2)}${unit}`,
    "--r-heading-align-items": t.headingAlign === "center" ? "center" : "flex-start",
    "--r-bullet-hang": t.bulletHangingIndent
      ? lengthToCss(t.bulletIndent)
      : "0",
  };
}

export type CssVars = Record<string, string>;

export function tokensToCssVars(
  tokens: ThemeTokens,
  overrides?: ThemeOverrides,
): CssVars {
  const merged = overrides ? { ...tokens, ...overrides } : tokens;
  const vars: CssVars = {};
  for (const [key, value] of Object.entries(merged)) {
    const css = tokenToCss(key, value);
    if (css !== null) vars[cssVarName(key)] = css;
  }
  return { ...vars, ...derived(merged as ThemeTokens) };
}

/** Only the overridden keys, for scoping onto a section element. */
export function overridesToCssVars(overrides: ThemeOverrides): CssVars {
  const vars: CssVars = {};
  for (const [key, value] of Object.entries(overrides)) {
    const css = tokenToCss(key, value);
    if (css !== null) vars[cssVarName(key)] = css;
  }
  return vars;
}

/** Imperative application, the hot path used while dragging a control. */
