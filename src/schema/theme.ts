import { z } from "zod";
import { zColor, zLength } from "./common";

export const THEME_SCHEMA_VERSION = 1;

/**
 * Fonts that have been round-tripped through the extraction harness.
 * The list is short because it has been tested, not because other fonts
 * are forbidden. See docs/04-ats-rules.md.
 */
export const SAFE_FONTS = [
  "Arial",
  "Helvetica",
  "Calibri",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Georgia",
  "Cambria",
  "Garamond",
  "Times New Roman",
  "Book Antiqua",
] as const;

export const zThemeTokens = z.object({
  // Page
  pageSize: z.enum(["Letter", "A4"]),
  marginTop: zLength,
  marginRight: zLength,
  marginBottom: zLength,
  marginLeft: zLength,
  showPageNumbers: z.boolean(),

  // Type
  fontFamily: z.string(),
  fontSizeBase: zLength,
  typeScale: z.number().min(1).max(1.6),
  lineHeight: z.number().min(1).max(2.2),
  headingSize: zLength,
  headingWeight: z.union([
    z.literal(400),
    z.literal(500),
    z.literal(600),
    z.literal(700),
  ]),
  headingCase: z.enum(["none", "upper", "capitalize"]),
  headingAlign: z.enum(["left", "center"]),
  headingLetterSpacing: zLength,
  nameSize: zLength,
  nameWeight: z.union([z.literal(400), z.literal(600), z.literal(700)]),
  nameAlign: z.enum(["left", "center"]),

  // Rhythm
  sectionGap: zLength,
  itemGap: zLength,
  bulletGap: zLength,
  paragraphGap: zLength,

  // Rules
  headingRule: z.enum(["none", "full", "underText"]),
  ruleWeight: zLength,
  ruleColor: zColor,
  ruleGap: zLength,

  // Colour
  colorText: zColor,
  colorHeading: zColor,
  colorMuted: zColor,
  colorAccent: zColor,
  colorLink: zColor,

  // Layout
  dateAlign: z.enum(["inline", "right"]),
  locationAlign: z.enum(["inline", "right"]),
  contactSeparator: z.string(),
  contactLayout: z.enum(["inline", "stacked"]),

  // Bullets
  bulletChar: z.string(),
  bulletIndent: zLength,
  bulletHangingIndent: z.boolean(),

  density: z.enum(["compact", "normal", "relaxed", "custom"]),
});
export type ThemeTokens = z.infer<typeof zThemeTokens>;
export type ThemeTokenKey = keyof ThemeTokens;

export const zTheme = z.object({
  schemaVersion: z.number().int(),
  id: z.string(),
  name: z.string(),
  /** Built-ins are read-only. Editing one forks a copy. */
  builtin: z.boolean(),
  tokens: zThemeTokens,
});
export type Theme = z.infer<typeof zTheme>;

export const zThemeOverrides = zThemeTokens.partial();
export type ThemeOverrides = z.infer<typeof zThemeOverrides>;
