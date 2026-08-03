"use client";

import { useCallback, useEffect, useState } from "react";
import { applyScheme, SCHEME_KEY } from "@/lib";
import css from "./site.module.css";

/**
 * Light or dark, as one button.
 *
 * The stored preference has a third state, "system", which is the default and
 * the one nobody has to choose. This control only ever writes light or dark:
 * pressing it is a statement, and a three-way cycle in a 32px button asks
 * people to work out which of three icons they are looking at.
 *
 * The icon shows what pressing it will do, not what is currently on. A moon on
 * a light page reads as "go dark", which is the action; a sun on a light page
 * reads as a status light nobody asked for.
 */
export function ThemeToggle() {
  /*
   * Undefined until mounted. The server has no way to know what this browser
   * stored, so rendering a definite icon in the HTML would be wrong half the
   * time and would hydrate into a mismatch. The button holds its size and
   * renders nothing inside it for the one frame before the effect runs.
   */
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

    /*
     * The OS changed while the tab was open. resolve() already prefers a stored
     * choice, so this is a no-op once one exists; applyScheme has to run too,
     * because the pre-paint script resolved the system preference to a literal
     * attribute and that attribute does not update itself.
     */
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
    <button
      type="button"
      className={css.themeToggle}
      onClick={toggle}
      aria-label={
        dark ? "Switch to the light theme" : "Switch to the dark theme"
      }
      title={dark ? "Light theme" : "Dark theme"}
    >
      {dark === undefined ? null : dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
