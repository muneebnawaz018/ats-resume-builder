import Link from "next/link";
import css from "./site.module.css";
import { NavMenu } from "./NavMenu";

/*
 * Order follows the page, top to bottom, so the bar doubles as a table of
 * contents: what it is, how the machine works, what goes wrong, questions.
 *
 * Four, not six. Both tool buttons have to fit alongside these at 1024, and
 * the two that went, "Check yours" and "Why free", are the ones the buttons
 * and the footer already cover.
 *
 * These are anchors into the landing page, so they only belong in the bar
 * while you are standing on it. Shown elsewhere they read as peers of the tool
 * routes and then throw you onto a different page. Off the landing page the
 * bar carries routes only.
 */
const HOME_LINKS = [
  { href: "#what", label: "What it does", key: "what" },
  { href: "#how", label: "How ATS works", key: "how" },
  { href: "#breaks", label: "What breaks", key: "breaks" },
  { href: "#faq", label: "FAQ", key: "faq" },
] as const;

const AWAY_LINKS = [{ href: "/", label: "Home", key: "home" }] as const;

/**
 * Shared site header.
 *
 * The mark is a page with a scan line through it, the product in one glyph.
 * Drawn inline as SVG so the header costs no extra request and stays crisp.
 *
 * Mark only, no wordmark: the name was the widest thing in the bar and the
 * first thing to push the buttons off the edge. The link still carries the
 * name for screen readers.
 */
export function SiteNav({
  current,
}: {
  current: "home" | "check" | "other";
}) {
  const links = current === "home" ? HOME_LINKS : AWAY_LINKS;

  return (
    <div className={css.navBar}>
      <div className={css.wrap}>
        <nav className={css.nav}>
          <Link
            href="/"
            className={css.brand}
            aria-label="ATS Resume Builder, home"
          >
            <span className={css.logo} aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 2.5h5.5L12.5 5.5V13a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.25 2.75V5.5h2.75"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M2 9.5h12"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </Link>

          <div className={css.navLinks}>
            {links.map((l) => (
              <Link key={l.key} href={l.href} className={css.navLink}>
                {l.label}
              </Link>
            ))}
          </div>

          {/*
            The tool buttons sit outside the link list so they survive when the
            links collapse into the menu, the actions stay reachable in one
            tap at every width.
          */}
          <div className={css.navActions}>
            <Link
              href="/resume-checker"
              aria-current={current === "check" ? "page" : undefined}
              className={`${css.navCtaGhost} ${
                current === "check" ? css.navCtaGhostActive : ""
              }`}
            >
              Check a resume
            </Link>
            <Link href="/resume-builder" className={css.navCta}>
              Build a resume
            </Link>
          </div>

          <NavMenu links={links} />
        </nav>
      </div>
    </div>
  );
}
