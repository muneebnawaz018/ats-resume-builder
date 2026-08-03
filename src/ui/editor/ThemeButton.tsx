"use client";

import { useCallback, useEffect, useState } from "react";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { applyScheme, SCHEME_KEY } from "@/lib";

/**
 * Light or dark, in the editor bar.
 *
 * The same control as the site header's, rebuilt on MUI rather than shared:
 * the content routes are not allowed to import MUI, and the editor bar is
 * built from nothing else. The state lives in one place regardless, the
 * `data-theme` attribute and the key both come from @/lib/scheme.
 *
 * The icon shows what pressing it will do, not what is currently on.
 */
export function ThemeButton() {
  const [dark, setDark] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const resolve = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(SCHEME_KEY);
      } catch {
        // Cookies blocked. The OS preference still works.
      }
      if (stored === "light" || stored === "dark") return stored === "dark";
      return media.matches;
    };

    setDark(resolve());

    // The pre-paint script resolved the OS preference to a literal attribute,
    // so a change to it has to be written through rather than inherited.
    const onSystem = () => {
      const next = resolve();
      setDark(next);
      applyScheme(next ? "dark" : "light");
    };
    media.addEventListener("change", onSystem);
    return () => media.removeEventListener("change", onSystem);
  }, []);

  const toggle = useCallback(() => {
    const next = dark ? "light" : "dark";
    setDark(!dark);
    applyScheme(next);
    try {
      localStorage.setItem(SCHEME_KEY, next);
    } catch {
      // Nothing to do: the page still changed, it just will not be remembered.
    }
  }, [dark]);

  return (
    <Tooltip title={dark ? "Light theme" : "Dark theme"}>
      <IconButton
        onClick={toggle}
        aria-label={dark ? "Switch to the light theme" : "Switch to the dark theme"}
        sx={{ flexShrink: 0 }}
      >
        {/* Undefined until mounted: the server cannot know what this browser
            stored, so a definite icon in the HTML would hydrate into a
            mismatch. The button holds its size meanwhile. */}
        {dark === undefined ? null : dark ? (
          <LightModeOutlinedIcon sx={{ fontSize: 17 }} />
        ) : (
          <DarkModeOutlinedIcon sx={{ fontSize: 17 }} />
        )}
      </IconButton>
    </Tooltip>
  );
}
