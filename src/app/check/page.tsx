import type { Metadata } from "next";
import Link from "next/link";
import css from "../home.module.css";

/**
 * The acquisition page. A checker gets shared; a builder gets used once and
 * forgotten. See the strategic recommendation in docs/05-competitive-analysis.md.
 *
 * Static shell here; the client tool mounts inside it from Phase 3.
 */
export const metadata: Metadata = {
  title: "Check whether your resume survives ATS parsing",
  description:
    "Upload nothing. Read your resume back the way hiring software does and see exactly which fields survived extraction.",
};

export default function CheckPage() {
  return (
    <div className={css.page}>
      <div className={css.wrap}>
        <nav className={css.nav}>
          <Link className={css.mark} href="/">
            ATS Resume Builder
          </Link>
          <div className={css.navLinks}>
            <Link href="/builder">Builder</Link>
          </div>
        </nav>

        <header className={css.hero}>
          <p className={css.eyebrow}>Runs entirely in your browser</p>
          <h1 className={css.headline}>
            Does your resume survive the parser?
          </h1>
          <p className={css.sub}>
            Drop in a PDF or Word file. We extract it the way an applicant
            tracking system does, rebuild the fields a recruiter would see, and
            show you what came through and what did not. The file never leaves
            this browser.
          </p>
          <div className={css.actions}>
            <Link className={css.btnGhost} href="/builder">
              Build a resume instead
            </Link>
          </div>
        </header>

        <section className={css.points}>
          <div className={css.point}>
            <h2>Arriving in Phase 3</h2>
            <p>
              The rule engine and the extraction harness land together, so the
              first version of this page reports measured results rather than
              guesses.
            </p>
          </div>
          <div className={css.point}>
            <h2>What it will report</h2>
            <p>
              Reading order, recovered fields, encoding problems, and the
              structural issues that only affect imported files — each with the
              evidence behind it.
            </p>
          </div>
          <div className={css.point}>
            <h2>What it will not do</h2>
            <p>
              Claim compatibility with a named vendor we have not tested, hide
              findings behind payment, or award a perfect score.
            </p>
          </div>
        </section>

        <footer className={css.foot}>
          <span>No upload. No account. No paywall.</span>
          <Link href="/">Home</Link>
        </footer>
      </div>
    </div>
  );
}
