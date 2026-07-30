import Link from "next/link";
import { site } from "@/lib";
import css from "@/ui/site/site.module.css";

/**
 * The site footer.
 *
 * Two shapes, one source. `full` carries the brand block and both link lists;
 * `bar` is the copyright strip alone, for pages whose own content already
 * covers the links. They were separate copies before, which is how the
 * copyright line ended up worded two different ways.
 */
const TOOLS = [
  {
    href: "/resume-builder",
    label: "Open the builder",
    note: "Write and style a resume, export it when you like.",
  },
  {
    href: "/resume-checker",
    label: "Check a resume",
    note: "Read a file you already have back through a parser.",
  },
  {
    href: "/#what",
    label: "What you can change",
    note: "Around thirty-five settings, all live.",
  },
] as const;

/** Same order as the nav and the page itself. */
const SECTIONS = [
  { href: "/#what", label: "What it does" },
  { href: "/#how", label: "How ATS parsing works" },
  { href: "/#breaks", label: "What breaks a resume" },
  { href: "/#check", label: "Check yours" },
  { href: "/#why", label: "Why this is free" },
  { href: "/#faq", label: "Questions" },
] as const;

/** Baked at build time. A static export has no request to read a clock on. */
const YEAR = new Date().getFullYear();

function Mark() {
  return (
    <span className={css.footMark} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M4 2.5h5.5L12.5 5.5V13a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M9.25 2.75V5.5h2.75" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M2 9.5h12"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function SiteFooter({ variant = "full" }: { variant?: "full" | "bar" }) {
  return (
    <div className={css.wrap}>
      <footer className={css.foot}>
        {variant === "full" ? (
          <div className={css.footTop}>
            <div>
              <p className={css.footBrand}>
                <Mark />
                {site.name}
              </p>
              <p className={css.footBlurb}>
                Write a resume, export it, then read it back the way hiring
                software does. Nothing is uploaded and nothing is held back
                behind a payment.
              </p>
            </div>

            <div>
              <p className={css.footColTitle}>Tools</p>
              <ul className={`${css.footLinks} ${css.footLinksRich}`}>
                {TOOLS.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href}>{t.label}</Link>
                    <span className={css.footLinkNote}>{t.note}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className={css.footColTitle}>On this page</p>
              <ul className={css.footLinks}>
                {SECTIONS.map((s) => (
                  <li key={s.href}>
                    <Link href={s.href}>{s.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div
          className={css.footBar}
          style={variant === "bar" ? { marginTop: 0, borderTop: 0 } : undefined}
        >
          <span>
            © {YEAR} {site.name}
          </span>
          <span className={css.footBarLinks}>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
