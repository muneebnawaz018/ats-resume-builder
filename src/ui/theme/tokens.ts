/**
 * The one source of design tokens for the whole application.
 *
 * Read twice, defined once:
 *   - `muiTheme.ts` builds the MUI palette from it (editor chrome)
 *   - `cssVarBlock()` emits it as custom properties for plain-CSS routes
 *
 * Anything that needs a colour or a spacing step takes it from here, so the
 * marketing pages and the editor cannot drift apart.
 *
 * Light, because the product's output is a white page. Chrome sits a step
 * below paper white so the document still reads as the object in the room,
 * the way a sheet on a desk does.
 */

export const tone = {
  /** Panels, inputs, the document itself. */
  surface0: "#FFFFFF",
  /** Application background — one step down from paper. */
  surface1: "#F4F6F8",
  /** Hover, selected rows, inset wells. */
  surface2: "#EAEEF2",
  /** Pressed / heavier fill. */
  surface3: "#DFE5EB",

  /** Hairlines between panels. */
  line1: "#E3E8ED",
  /** Input borders, stronger dividers. */
  line2: "#C9D2DB",

  /** Primary text. 14.9:1 on surface0. */
  text1: "#1A1F26",
  /** Secondary text, labels. 7.9:1. */
  text2: "#48535F",
  /** Muted help text. 4.7:1 — still passes AA. */
  text3: "#6A7784",
} as const;

/**
 * Non-photo blue: the blue a process camera does not reproduce, used in
 * printing for marks that guide the person doing the work and never appear in
 * the printed result. On white paper that is exactly how it reads.
 *
 * Two values, because guides and controls have different jobs. `guideMark` is
 * drawn on the document and must stay quiet. `accent` is interactive and must
 * clear 4.5:1 contrast.
 */
export const blue = {
  guideMark: "#7FC3E3",
  guideWash: "rgba(127, 195, 227, 0.20)",
  accent: "#0F6FB8",
  accentHover: "#0C5C99",
  accentWash: "rgba(15, 111, 184, 0.08)",
} as const;

/** Findings are routine, not alarms. Muted enough to read all day. */
export const severity = {
  flag: "#C4372A",
  flagWash: "rgba(196, 55, 42, 0.07)",
  caution: "#8A5A06",
  cautionWash: "rgba(138, 90, 6, 0.08)",
  pass: "#1E7A4F",
  passWash: "rgba(30, 122, 79, 0.07)",
} as const;

export const radius = { sm: 3, md: 5 } as const;

export const font = {
  sans: "var(--font-plex-sans), system-ui, -apple-system, sans-serif",
  mono: "var(--font-plex-mono), ui-monospace, SFMono-Regular, monospace",
  serif: "var(--font-plex-serif), Georgia, serif",
} as const;

/**
 * Emitted into a <style> tag in the root layout so plain-CSS routes and the
 * editor share literally the same values.
 */
export function cssVarBlock(): string {
  const vars: Record<string, string> = {
    "--surface-0": tone.surface0,
    "--surface-1": tone.surface1,
    "--surface-2": tone.surface2,
    "--surface-3": tone.surface3,
    "--line-1": tone.line1,
    "--line-2": tone.line2,
    "--text-1": tone.text1,
    "--text-2": tone.text2,
    "--text-3": tone.text3,
    "--guide-mark": blue.guideMark,
    "--guide-wash": blue.guideWash,
    "--accent": blue.accent,
    "--accent-hover": blue.accentHover,
    "--accent-wash": blue.accentWash,
    "--flag": severity.flag,
    "--flag-wash": severity.flagWash,
    "--caution": severity.caution,
    "--caution-wash": severity.cautionWash,
    "--pass": severity.pass,
    "--pass-wash": severity.passWash,
    "--radius-sm": `${radius.sm}px`,
    "--radius-md": `${radius.md}px`,
  };
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return `:root{${body};color-scheme:light}`;
}
