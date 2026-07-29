"use client";

import Button from "@mui/material/Button";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * MUI Button wired to Next's Link, so the site's calls to action use the same
 * component and theme as the editor.
 *
 * Note the cost: MUI is a client component library, so any content route that
 * renders this ships the MUI and Emotion runtime. That is a deliberate trade
 * for one design system across the whole product — see docs/03-architecture.md.
 */
export function SiteButton({
  href,
  children,
  variant = "contained",
  size = "large",
  startIcon,
}: {
  href: string;
  children: ReactNode;
  variant?: "contained" | "outlined" | "text";
  size?: "small" | "medium" | "large";
  startIcon?: ReactNode;
}) {
  return (
    <Button
      component={Link}
      href={href}
      variant={variant}
      size={size}
      startIcon={startIcon}
      disableElevation={variant !== "contained"}
    >
      {children}
    </Button>
  );
}
