/**
 * The one source of design tokens for the whole application.
 *
 * Read twice, defined once:
 *   - `muiTheme.ts` builds the MUI theme from it (editor and site chrome)
 *   - `scripts/tasks.ts (tokens task)` emits it as CSS custom properties at build time
 *
 * Rules for this file:
 *   1. Every colour is declared once, as a hex, in `palette`.
 *   2. Nothing else hardcodes a colour. Translucent variants are derived with
 *      `alpha()`, never written out as another rgba string, otherwise the
 *      same colour drifts as literals get copied around.
 *   3. Semantic names (`accent`, `flag`) point at palette entries. Components
 *      use the semantic name, so a palette change lands everywhere at once.
 *
 * Light, because the product's output is a white page. Chrome sits a step
 * below paper white so the document still reads as the object in the room.
 */

/* ------------------------------------------------------------------ *
 * 1. Raw palette, the only place a colour literal is allowed
 * ------------------------------------------------------------------ */

export const palette = {
  white: "#FFFFFF",
  black: "#000000",

  /** Cool neutral ramp. */
  slate50: "#F7F9FB",
  slate100: "#F1F4F7",
  slate150: "#EAEEF2",
  slate200: "#DFE5EB",
  slate300: "#C9D2DB",
  slate400: "#9AA6B2",
  slate500: "#626E7B",
  slate600: "#48535F",
  slate700: "#333C46",
  slate900: "#1A1F26",

  /**
   * Non-photo blue: in printing, the blue a process camera does not
   * reproduce, used for marks that guide the person doing the work and never
   * appear in the result. Here that is literally true of the editor guides.
   */
  blue200: "#BFE2F3",
  blue300: "#7FC3E3",
  blue500: "#1789CE",
  blue600: "#0F6FB8",
  blue700: "#0C5C99",

  red600: "#C4372A",
  amber700: "#8A5A06",
  green600: "#1E7A4F",

  /**
   * Dark ramp. Not the light one inverted.
   *
   * A slate ramp read backwards gives muddy mid-greys, because the light ramp
   * is tuned for ink on paper and spends most of its range near white. These
   * are picked for the opposite job: near-black surfaces separated by a few
   * points of lightness each, so a panel on a background reads as raised
   * without a shadow, which is invisible at this end of the scale.
   */
  ink900: "#090B0F",
  ink850: "#0D1117",
  ink800: "#151A21",
  ink700: "#1E242D",
  ink600: "#2A323D",
  ink550: "#1A1F27",
  mist400: "#5D6875",
  mist300: "#7F8B99",
  mist200: "#A6B1BF",
  mist100: "#E7EDF4",

  /** Lifted for dark surfaces: blue600 on near-black is under 3:1. */
  blue350: "#4CB2E8",
  blue250: "#7ECDF5",

  red400: "#FF6B5E",
  amber400: "#E0A640",
  green400: "#3FBF85",
} as const;


/* ------------------------------------------------------------------ *
 * 2. The formula
 * ------------------------------------------------------------------ */

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * One translucent colour, derived rather than hand-written.
 *
 * Every wash, border and shadow in the app is `alpha()` of a palette entry, so
 * changing a palette value moves everything derived from it. A literal
 * `rgba(...)` anywhere else is drift waiting to happen.
 */
export function alpha(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex);
  const a = Math.max(0, Math.min(1, amount));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/* ------------------------------------------------------------------ *
 * 3. Semantic tokens, what components actually use
 * ------------------------------------------------------------------ */

export const tone = {
  /** Panels, inputs, the document itself. */
  surface0: palette.white,
  /** Application background, one step below paper. */
  surface1: palette.slate50,
  /** Hover, selected rows, inset wells. */
  surface2: palette.slate150,
  /** Pressed, heavier fill. */
  surface3: palette.slate200,

  /** Hairlines between panels. */
  line1: palette.slate100,
  /** Input borders, stronger dividers. */
  line2: palette.slate300,

  /** Primary text. */
  text1: palette.slate900,
  /** Secondary text and labels. */
  text2: palette.slate600,
  /** Muted help text, still passes AA on surface0. */
  text3: palette.slate500,
  /** Faint and decorative only. Never load-bearing text. */
  text4: palette.slate400,
} as const;

export const blue = {
  /** Drawn on the document. Must stay quiet. */
  guideMark: palette.blue300,
  guideWash: alpha(palette.blue300, 0.2),
  /** Interactive. Clears 4.5:1 on surface0. */
  accent: palette.blue600,
  accentHover: palette.blue700,
  accentSoft: palette.blue500,
  accentWash: alpha(palette.blue600, 0.08),
  accentWashStrong: alpha(palette.blue600, 0.14),
  accentBorder: alpha(palette.blue600, 0.22),
} as const;

/** Findings are routine, not alarms. Muted enough to read all day. */
export const severity = {
  flag: palette.red600,
  flagWash: alpha(palette.red600, 0.07),
  flagBorder: alpha(palette.red600, 0.22),
  caution: palette.amber700,
  cautionWash: alpha(palette.amber700, 0.08),
  pass: palette.green600,
  passWash: alpha(palette.green600, 0.07),
} as const;

/* ------------------------------------------------------------------ *
 * 3b. The same semantics, in the dark
 *
 * Same names, same meanings, different values. Nothing in the application
 * chooses between these: components read `var(--surface-0)` and the scheme in
 * effect decides what that is. The one exception is the resume document, which
 * is driven entirely by its own `--r-*` variables and stays white paper under
 * either scheme, because that is what comes out of the printer.
 * ------------------------------------------------------------------ */

export const darkTone: Record<keyof typeof tone, string> = {
  surface0: palette.ink850,
  surface1: palette.ink900,
  surface2: palette.ink800,
  surface3: palette.ink700,
  line1: palette.ink550,
  line2: palette.ink600,
  text1: palette.mist100,
  text2: palette.mist200,
  text3: palette.mist300,
  text4: palette.mist400,
};

export const darkBlue: Record<keyof typeof blue, string> = {
  guideMark: palette.blue350,
  guideWash: alpha(palette.blue350, 0.22),
  accent: palette.blue350,
  accentHover: palette.blue250,
  accentSoft: palette.blue350,
  /* Washes carry further on a dark surface than a light one at the same
     opacity, so these are not the light values reused. */
  accentWash: alpha(palette.blue350, 0.1),
  accentWashStrong: alpha(palette.blue350, 0.18),
  accentBorder: alpha(palette.blue350, 0.32),
};

export const darkSeverity: Record<keyof typeof severity, string> = {
  flag: palette.red400,
  flagWash: alpha(palette.red400, 0.12),
  flagBorder: alpha(palette.red400, 0.34),
  caution: palette.amber400,
  cautionWash: alpha(palette.amber400, 0.12),
  pass: palette.green400,
  passWash: alpha(palette.green400, 0.12),
};

/* ------------------------------------------------------------------ *
 * 4. Shape, depth, motion
 * ------------------------------------------------------------------ */

/** Softer than a precision instrument. Rounded enough to feel approachable. */
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

/** Layered, low-opacity shadows, depth without a hard edge. All derived from
 *  one ink colour so they tint consistently. */
const ink = palette.slate900;
export const shadow = {
  sm: `0 1px 2px ${alpha(ink, 0.05)}, 0 1px 1px ${alpha(ink, 0.04)}`,
  md: `0 2px 4px ${alpha(ink, 0.04)}, 0 6px 16px ${alpha(ink, 0.07)}`,
  lg: `0 4px 8px ${alpha(ink, 0.05)}, 0 16px 40px ${alpha(ink, 0.1)}`,
  ring: `0 0 0 4px ${alpha(palette.blue600, 0.14)}`,
} as const;

/**
 * Shadows in the dark.
 *
 * A soft grey shadow does nothing against a near-black background, so these
 * are near-opaque black and paired with a hairline top highlight. The
 * highlight is what actually reads as elevation: the edge catching light.
 */
export const darkShadow: Record<keyof typeof shadow, string> = {
  sm: `0 1px 2px ${alpha(palette.black, 0.4)}`,
  md: `0 6px 20px ${alpha(palette.black, 0.45)}`,
  lg: `0 18px 48px ${alpha(palette.black, 0.55)}`,
  ring: `0 0 0 4px ${alpha(palette.blue350, 0.28)}`,
};

/** The hairline that stands in for a shadow. Set per scheme. */
export const edge = {
  light: alpha(palette.slate900, 0.06),
  dark: alpha(palette.white, 0.07),
} as const;

/** The same, at half strength, for rules inside a panel. */
export const edgeSoft = {
  light: alpha(palette.slate900, 0.04),
  dark: alpha(palette.white, 0.045),
} as const;

/** Inner top highlight. Only visible, and only wanted, on dark surfaces. */
export const lift = {
  light: "none",
  dark: `inset 0 1px 0 ${alpha(palette.white, 0.035)}`,
} as const;

/**
 * Text on a filled accent button.
 *
 * White on the dark blue, ink on the light one. The accent has to lift in the
 * dark to clear 3:1 against a near-black surface, and once it does, white text
 * on top of it fails.
 */
export const onAccent = {
  light: palette.white,
  dark: palette.ink900,
} as const;

/** One rhythm for the whole app. Exit faster than enter. */
export const motion = {
  fast: "120ms",
  base: "220ms",
  slow: "380ms",
  ease: "cubic-bezier(.22,.61,.36,1)",
  spring: "cubic-bezier(.34,1.56,.64,1)",
} as const;

export const font = {
  sans: "var(--font-ui), system-ui, -apple-system, sans-serif",
  mono: "var(--font-mono), ui-monospace, SFMono-Regular, monospace",
} as const;
