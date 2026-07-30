"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import css from "./site.module.css";

/**
 * The narrow-screen menu.
 *
 * This was a <details> element dismissed by a listener in a shared effect,
 * which kept failing: the listener resolved the element once, and anything
 * that re-rendered the header left it holding a detached node. Owning the
 * state here makes dismissal a property of the component instead of a global
 * side effect that has to find its own target.
 *
 * A real backdrop element does the outside-click work, nothing outside can
 * swallow the event, because the backdrop is what receives it.
 */
export function NavMenu({
  links,
}: {
  links: readonly { href: string; label: string; key: string }[];
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Escape should leave focus on the control that opened the menu.
      buttonRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={css.navMenu}>
      <button
        ref={buttonRef}
        type="button"
        className={css.navMenuButton}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={`${css.navBurger} ${open ? css.navBurgerOpen : ""}`}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </span>
      </button>

      {open ? (
        <>
          <div
            className={css.navBackdrop}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className={css.navMenuPanel}>
            {links.map((l) => (
              <Link
                key={l.key}
                href={l.href as Route}
                className={css.navMenuLink}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/resume-checker"
              className={`${css.navCtaGhost} ${css.navMenuCta}`}
              onClick={() => setOpen(false)}
            >
              Check a resume
            </Link>
            <Link
              href="/resume-builder"
              className={`${css.navCta} ${css.navMenuCta}`}
              onClick={() => setOpen(false)}
            >
              Build a resume
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
