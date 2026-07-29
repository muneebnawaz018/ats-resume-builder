import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import css from "./home.module.css";

/**
 * The site's call to action.
 *
 * Deliberately not MUI. This used to wrap MUI's Button so the marketing pages
 * and the editor shared one component — but MUI is a client library, so every
 * content route that rendered it shipped the MUI and Emotion runtime for what
 * is, in the end, a styled anchor. The editor keeps MUI; these pages do not.
 *
 * The styling reads the same tokens the MUI theme does, so the two cannot
 * drift apart visually.
 */
export function SiteButton({
  href,
  children,
  variant = "contained",
}: {
  // typedRoutes: a typo in a href is a build error rather than a 404.
  href: Route;
  children: ReactNode;
  variant?: "contained" | "outlined";
}) {
  return (
    <Link
      href={href}
      className={`${css.btn} ${
        variant === "contained" ? css.btnPrimary : css.btnGhost
      }`}
    >
      {children}
    </Link>
  );
}
