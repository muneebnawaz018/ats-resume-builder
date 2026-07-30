import { THEME_SCHEMA_VERSION, type Theme, type ThemeTokens } from "./theme";
import type { Length } from "./common";

const pt = (value: number): Length => ({ value, unit: "pt" });
const inch = (value: number): Length => ({ value, unit: "in" });

const baseTokens: ThemeTokens = {
  pageSize: "Letter",
  marginTop: inch(0.55),
  marginRight: inch(0.6),
  marginBottom: inch(0.55),
  marginLeft: inch(0.6),
  showPageNumbers: false,

  fontFamily: "Georgia",
  fontSizeBase: pt(10.5),
  typeScale: 1.15,
  lineHeight: 1.34,
  headingSize: pt(11),
  headingWeight: 700,
  headingCase: "upper",
  headingAlign: "left",
  headingLetterSpacing: pt(0.6),
  nameSize: pt(20),
  nameWeight: 700,
  nameAlign: "left",

  sectionGap: pt(11),
  itemGap: pt(7),
  bulletGap: pt(2.5),
  paragraphGap: pt(4),

  headingRule: "full",
  ruleWeight: pt(0.75),
  ruleColor: "#111111",
  ruleGap: pt(3),

  colorText: "#111111",
  colorHeading: "#000000",
  colorMuted: "#454545",
  colorAccent: "#111111",
  colorLink: "#1a1a1a",

  dateAlign: "right",
  locationAlign: "inline",
  contactSeparator: "  ·  ",
  contactLayout: "inline",

  bulletChar: "•",
  bulletIndent: pt(11),
  bulletHangingIndent: true,

  density: "normal",
};

const theme = (
  id: string,
  name: string,
  tokens: Partial<ThemeTokens>,
): Theme => ({
  schemaVersion: THEME_SCHEMA_VERSION,
  id,
  name,
  builtin: true,
  tokens: { ...baseTokens, ...tokens },
});

/**
 * Built-in themes are ordinary token sets — a "template" here is nothing more
 * than saved JSON, which is what makes theme sharing possible.
 */
export const BUILTIN_THEMES: Theme[] = [
  theme("classic", "Classic", {}),

  theme("compact", "Compact", {
    fontFamily: "Calibri",
    fontSizeBase: pt(10),
    lineHeight: 1.22,
    sectionGap: pt(8),
    itemGap: pt(5),
    bulletGap: pt(1.5),
    marginTop: inch(0.45),
    marginRight: inch(0.5),
    marginBottom: inch(0.45),
    marginLeft: inch(0.5),
    density: "compact",
  }),

  theme("modern", "Modern", {
    fontFamily: "Arial",
    fontSizeBase: pt(10.5),
    headingCase: "upper",
    headingRule: "underText",
    headingLetterSpacing: pt(1.2),
    nameSize: pt(22),
    nameAlign: "center",
    contactLayout: "inline",
    ruleWeight: pt(1.25),
    ruleColor: "#222222",
    bulletChar: "–",
  }),

  theme("serif", "Serif", {
    fontFamily: "Garamond",
    fontSizeBase: pt(11.5),
    lineHeight: 1.4,
    headingCase: "capitalize",
    headingWeight: 600,
    headingRule: "none",
    nameSize: pt(23),
    nameWeight: 400,
    sectionGap: pt(13),
  }),

  theme("plain", "Plain", {
    fontFamily: "Times New Roman",
    headingRule: "none",
    headingCase: "upper",
    headingWeight: 700,
    dateAlign: "inline",
    nameAlign: "left",
    nameSize: pt(18),
    bulletChar: "-",
  }),

  theme("wide", "Wide", {
    fontFamily: "Verdana",
    fontSizeBase: pt(10),
    lineHeight: 1.45,
    marginRight: inch(0.85),
    marginLeft: inch(0.85),
    headingLetterSpacing: pt(1.6),
    density: "relaxed",
  }),
];

export const DEFAULT_THEME_ID = "classic";

