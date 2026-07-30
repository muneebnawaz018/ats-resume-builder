"use client";

import { createTheme } from "@mui/material/styles";
import {
  blue,
  font,
  motion,
  palette,
  radius,
  severity,
  shadow,
  tone,
} from "@/ui/tokens";

/**
 * MUI's defaults are the templated Material look and are overridden wholesale.
 * Every value comes from tokens.ts, which the plain-CSS routes read too, so
 * the marketing pages and the editor cannot drift apart.
 */
export const muiTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    background: { default: tone.surface1, paper: tone.surface0 },
    primary: { main: blue.accent, dark: blue.accentHover, contrastText: palette.white },
    secondary: { main: tone.text2 },
    error: { main: severity.flag },
    warning: { main: severity.caution },
    success: { main: severity.pass },
    divider: tone.line1,
    text: { primary: tone.text1, secondary: tone.text2, disabled: tone.text3 },
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
          boxShadow: shadow.sm,
          "&:hover": { boxShadow: shadow.md },
        },
        outlined: {
          borderColor: tone.line2,
          "&:hover": { borderColor: blue.accent, background: blue.accentWash },
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
          border: `1px solid ${tone.line1}`,
          borderRadius: radius.md,
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
        paper: { borderRadius: radius.lg, boxShadow: shadow.lg },
      },
    },

    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 400 },
      styleOverrides: {
        tooltip: {
          backgroundColor: tone.text1,
          fontSize: 12,
          lineHeight: 1.45,
          padding: "6px 9px",
          maxWidth: 260,
          borderRadius: radius.sm,
        },
        arrow: { color: tone.text1 },
      },
    },

    MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: tone.surface0,
          borderRadius: radius.sm,
          transition: `box-shadow ${motion.fast} ${motion.ease}`,
          "& fieldset": {
            borderColor: tone.line2,
            transition: `border-color ${motion.fast} ${motion.ease}`,
          },
          "&:hover fieldset": { borderColor: tone.text3 },
          "&.Mui-focused": { boxShadow: shadow.ring },
        },
        input: { fontSize: 13.5, paddingBlock: 8.5 },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: 13 } } },
    MuiFormHelperText: {
      styleOverrides: {
        root: { fontSize: 11.5, marginLeft: 0, color: tone.text3, lineHeight: 1.45 },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 38 },
        indicator: { height: 2, backgroundColor: blue.accent },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 38,
          fontSize: 13,
          fontWeight: 500,
          textTransform: "none",
          minWidth: 0,
          paddingInline: 14,
          color: tone.text2,
        },
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontSize: 12.5,
          paddingInline: 14,
          paddingBlock: 5,
          borderColor: tone.line2,
          color: tone.text2,
          borderRadius: radius.sm,
          transition: `background-color ${motion.fast} ${motion.ease}, color ${motion.fast} ${motion.ease}`,
          "&.Mui-selected": {
            backgroundColor: blue.accentWash,
            color: blue.accent,
            fontWeight: 500,
          },
        },
      },
    },

    MuiSlider: {
      defaultProps: { size: "small" },
      styleOverrides: {
        rail: { opacity: 1, backgroundColor: tone.surface3 },
        thumb: {
          width: 13,
          height: 13,
          "&:hover, &.Mui-focusVisible": {
            boxShadow: `0 0 0 6px ${blue.accentWash}`,
          },
        },
      },
    },

    MuiIconButton: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          color: tone.text2,
          transition: `background-color ${motion.fast} ${motion.ease}, color ${motion.fast} ${motion.ease}, transform ${motion.fast} ${motion.spring}`,
          "&:hover": { color: blue.accent, transform: "scale(1.12)" },
          "&:active": { transform: "scale(.94)" },
        },
      },
    },

    MuiDivider: { styleOverrides: { root: { borderColor: tone.line1 } } },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          transition: `background-color ${motion.fast} ${motion.ease}, padding-left ${motion.base} ${motion.ease}`,
          "&:hover": { paddingLeft: 12 },
          "&.Mui-selected": {
            backgroundColor: blue.accentWash,
            "&:hover": { backgroundColor: blue.accentWash },
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
          borderBottom: `1px solid ${tone.line1}`,
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
          outline: `2px solid ${blue.accent}`,
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
