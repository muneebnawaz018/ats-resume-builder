/**
 * The design tokens as CSS custom properties, for anything styled in
 * JavaScript.
 *
 * A colour read straight out of `@/ui/tokens` is resolved once, when the module
 * is imported, so it is whichever scheme happened to be compiled in, forever.
 * Emotion's `sx` and MUI's `styleOverrides` are both compiled that way, which
 * made the entire editor immune to the theme switch. Referencing the variable
 * instead defers the decision to the document, where `data-theme` decides.
 *
 * Names match `tokens.ts` exactly, so any value here is traceable back to its
 * definition by kebab-casing it. The literal exports are still correct for the
 * one case that needs a real colour: MUI's palette, which derives shades and
 * contrast text and so cannot be handed a `var(...)`.
 */
export const v = {
  surface0: "var(--surface-0)",
  surface1: "var(--surface-1)",
  surface2: "var(--surface-2)",
  surface3: "var(--surface-3)",

  line1: "var(--line-1)",
  line2: "var(--line-2)",
  /** The hairline that replaces a shadow. Scheme-aware, see tokens.edge. */
  edge: "var(--edge)",
  edgeSoft: "var(--edge-soft)",
  /** Inner top highlight. `none` in light, a faint white line in dark. */
  lift: "var(--lift)",

  text1: "var(--text-1)",
  text2: "var(--text-2)",
  text3: "var(--text-3)",
  text4: "var(--text-4)",

  accent: "var(--accent)",
  accentHover: "var(--accent-hover)",
  accentWash: "var(--accent-wash)",
  accentBorder: "var(--accent-border)",
  /** Text on a filled accent surface: white in light, ink in dark. */
  onAccent: "var(--on-accent)",
  guideMark: "var(--guide-mark)",

  flag: "var(--flag)",
  flagWash: "var(--flag-wash)",
  flagBorder: "var(--flag-border)",
  caution: "var(--caution)",
  cautionWash: "var(--caution-wash)",
  pass: "var(--pass)",
  passWash: "var(--pass-wash)",

  shadowSm: "var(--shadow-sm)",
  shadowMd: "var(--shadow-md)",
  shadowLg: "var(--shadow-lg)",
  shadowRing: "var(--shadow-ring)",
} as const;

/**
 * The mono label used on every panel header, in the editor and on the site.
 *
 * Spread into `sx`. It is one object rather than six repeated declarations
 * because the whole point of the treatment is that every one of them matches.
 */
export const monoLabel = {
  fontFamily: "var(--font-mono), ui-monospace, monospace",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: v.text4,
} as const;
