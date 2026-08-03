"use client";

import { createTheme } from "@mui/material/styles";
import { v } from "./vars";
import {
  blue,
  darkBlue,
  darkSeverity,
  darkTone,
  font,
  motion,
  palette,
  radius,
  severity,
  tone,
} from "@/ui/tokens";

/**
 * MUI's defaults are the templated Material look and are overridden wholesale.
 * Every value comes from tokens.ts, which the plain-CSS routes read too, so
 * the marketing pages and the editor cannot drift apart.
 *
 * Two schemes, selected by the same `data-theme` attribute the inline script in
 * the root layout writes. MUI's own palette needs real colours rather than
 * `var(...)`, because it derives from them: it computes contrast text and
 * hover fills, and it cannot parse a shade out of a custom property. The
 * component overrides below use the variables instead, which is where the
 * colours that are only ever displayed live.
 */
export const muiTheme = createTheme({
  cssVariables: { colorSchemeSelector: "data-theme" },
  /* No attribute means "follow the OS", which is what the tokens stylesheet
     already does through its media query. */
  defaultColorScheme: "light",
  colorSchemes: {
    light: {
      palette: {
        background: { default: tone.surface1, paper: tone.surface0 },
        primary: {
          main: blue.accent,
          dark: blue.accentHover,
          contrastText: palette.white,
        },
        secondary: { main: tone.text2 },
        error: { main: severity.flag },
        warning: { main: severity.caution },
        success: { main: severity.pass },
        divider: tone.line1,
        text: { primary: tone.text1, secondary: tone.text2, disabled: tone.text3 },
      },
    },
    dark: {
      palette: {
        background: { default: darkTone.surface1, paper: darkTone.surface0 },
        primary: {
          main: darkBlue.accent,
          dark: darkBlue.accentHover,
          // Against a light blue, ink reads and white does not.
          contrastText: palette.ink900,
        },
        secondary: { main: darkTone.text2 },
        error: { main: darkSeverity.flag },
        warning: { main: darkSeverity.caution },
        success: { main: darkSeverity.pass },
        divider: darkTone.line1,
        text: {
          primary: darkTone.text1,
          secondary: darkTone.text2,
          disabled: darkTone.text3,
        },
      },
    },
  },

  /** Anything the machine measured is set in mono. Anything a person wrote is sans. */
  typography: {
    fontFamily: font.sans,
    fontSize: 13,
    h1: { fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em" },
    h2: { fontSize: 24, fontWeight: 600, letterSpacing: "-0.015em" },
    h3: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" },
    body1: { fontSize: 14, lineHeight: 1.55 },
    body2: { fontSize: 13, lineHeight: 1.5 },
    button: { fontSize: 13, fontWeight: 500, textTransform: "none" },
    caption: { fontSize: 12, lineHeight: 1.5 },
    overline: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      lineHeight: 1.4,
    },
  },

  shape: { borderRadius: radius.sm },

  components: {
    MuiButtonBase: { defaultProps: { disableRipple: true } },

    MuiButton: {
      defaultProps: { disableElevation: true, size: "medium" },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          paddingInline: 18,
          minHeight: 40,
          fontWeight: 600,
          transition: `background-color ${motion.fast} ${motion.ease}, box-shadow ${motion.base} ${motion.ease}, transform ${motion.fast} ${motion.ease}, border-color ${motion.fast} ${motion.ease}`,
          "&:active": { transform: "scale(.97)" },
        },
        sizeSmall: { minHeight: 32, paddingInline: 12, borderRadius: radius.sm },
        sizeLarge: { minHeight: 48, paddingInline: 24, fontSize: 15.5 },
        contained: {
          boxShadow: v.shadowSm,
          "&:hover": { boxShadow: v.shadowMd },
        },
        outlined: {
          borderColor: v.line2,
          "&:hover": { borderColor: v.accent, background: v.accentWash },
        },
        text: { paddingInline: 10 },
      },
    },

    // Panels are surfaces, not floating cards, hairlines, never shadows.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${v.edge}`,
          borderRadius: radius.md,
          // The hairline replaces the shadow; in dark it needs the inner
          // highlight as well, or a panel and its background are the same tone.
          boxShadow: v.lift,
        },
      },
    },

    MuiDialog: {
      /*
       * Dialogs portal to <body>, outside the editor tree, so they miss the
       * data-chrome sweep that keeps the UI out of an exported PDF. Marking
       * every dialog at the theme level means a new one cannot forget.
       */
      defaultProps: {
        slotProps: {
          root: { "data-chrome": true } as Record<string, unknown>,
        },
      },
      styleOverrides: {
        paper: { borderRadius: radius.lg, boxShadow: v.shadowLg },
      },
    },

    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 400 },
      styleOverrides: {
        tooltip: {
          backgroundColor: v.text1,
          fontSize: 12,
          lineHeight: 1.45,
          padding: "6px 9px",
          maxWidth: 260,
          borderRadius: radius.sm,
        },
        arrow: { color: v.text1 },
      },
    },

    MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: v.surface0,
          borderRadius: radius.sm,
          transition: `box-shadow ${motion.fast} ${motion.ease}`,
          "& fieldset": {
            borderColor: v.line2,
            transition: `border-color ${motion.fast} ${motion.ease}`,
          },
          "&:hover fieldset": { borderColor: v.text3 },
          "&.Mui-focused": { boxShadow: v.shadowRing },
        },
        input: { fontSize: 13.5, paddingBlock: 8.5 },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: 13 } } },
    MuiFormHelperText: {
      styleOverrides: {
        root: { fontSize: 11.5, marginLeft: 0, color: v.text3, lineHeight: 1.45 },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 38 },
        indicator: { height: 2, backgroundColor: v.accent },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 38,
          fontFamily: font.mono,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          minWidth: 0,
          paddingInline: 14,
          color: v.text4,
        },
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontFamily: font.mono,
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          paddingInline: 14,
          paddingBlock: 5,
          borderColor: v.line2,
          color: v.text2,
          borderRadius: radius.sm,
          transition: `background-color ${motion.fast} ${motion.ease}, color ${motion.fast} ${motion.ease}`,
          "&.Mui-selected": {
            backgroundColor: v.accentWash,
            color: v.accent,
            fontWeight: 500,
          },
        },
      },
    },

    MuiSlider: {
      defaultProps: { size: "small" },
      styleOverrides: {
        rail: { opacity: 1, backgroundColor: v.surface3 },
        thumb: {
          width: 13,
          height: 13,
          "&:hover, &.Mui-focusVisible": {
            boxShadow: `0 0 0 6px ${v.accentWash}`,
          },
        },
      },
    },

    MuiIconButton: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          color: v.text2,
          transition: `background-color ${motion.fast} ${motion.ease}, color ${motion.fast} ${motion.ease}, transform ${motion.fast} ${motion.spring}`,
          "&:hover": { color: v.accent, transform: "scale(1.12)" },
          "&:active": { transform: "scale(.94)" },
        },
      },
    },

    MuiDivider: { styleOverrides: { root: { borderColor: v.edge } } },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          transition: `background-color ${motion.fast} ${motion.ease}, padding-left ${motion.base} ${motion.ease}`,
          "&:hover": { paddingLeft: 12 },
          "&.Mui-selected": {
            backgroundColor: v.accentWash,
            "&:hover": { backgroundColor: v.accentWash },
          },
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 28 } } },

    MuiChip: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: { borderRadius: radius.pill, fontSize: 12 },
      },
    },


    MuiAccordion: {
      defaultProps: { disableGutters: true, elevation: 0, square: true },
      styleOverrides: {
        root: {
          border: "none",
          borderBottom: `1px solid ${v.line1}`,
          "&::before": { display: "none" },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: { minHeight: 40, paddingInline: 14 },
        content: { marginBlock: 8 },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: { root: { padding: "0 14px 16px" } },
    },

    MuiCssBaseline: {
      styleOverrides: {
        "*:focus-visible": {
          outline: `2px solid ${v.accent}`,
          outlineOffset: 2,
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*": {
            animationDuration: "0.01ms !important",
            transitionDuration: "0.01ms !important",
          },
        },
      },
    },
  },
});
