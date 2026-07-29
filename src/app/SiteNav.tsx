import Link from "next/link";
import css from "./home.module.css";

/*
 * Order follows the page, top to bottom, so the bar doubles as a table of
 * contents: what it is, how the machine works, what goes wrong, checking a
 * resume you already have, why it costs nothing, questions.
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
  { href: "#check", label: "Check yours", key: "check" },
  { href: "#why", label: "Why free", key: "why" },
  { href: "#faq", label: "FAQ", key: "faq" },
] as const;

const AWAY_LINKS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/resume-checker", label: "Check a resume", key: "check" },
] as const;

/**
 * Shared site header.
 *
 * The mark is a page with a scan line through it — the product in one glyph.
 * Drawn inline as SVG so the header costs no extra request and stays crisp.
 */
export function SiteNav({ current }: { current: "home" | "check" }) {
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
            <span className={css.brandName}>ATS Resume Builder</span>
          </Link>

          <div className={css.navLinks}>
            {(current === "home" ? HOME_LINKS : AWAY_LINKS).map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className={`${css.navLink} ${
                  current === "check" && l.key === "check"
                    ? css.navLinkActive
                    : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/resume-builder" className={css.navCta}>
              Build a resume
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
