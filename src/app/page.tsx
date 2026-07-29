import Link from "next/link";
import css from "./home.module.css";

/**
 * Static. No MUI, no client components — this route must ship almost no JS
 * and must carry its content in the initial HTML response. Verify with
 * `curl`, not devtools.
 */
export default function HomePage() {
  return (
    <div className={css.page}>
      <div className={css.wrap}>
        <nav className={css.nav}>
          <span className={css.mark}>ATS Resume Builder</span>
          <div className={css.navLinks}>
            <Link href="/check">Check a resume</Link>
            <Link href="/builder">Builder</Link>
          </div>
        </nav>

        <header className={css.hero}>
          <p className={css.eyebrow}>Free · No account · Nothing uploaded</p>
          <h1 className={css.headline}>
            See your resume the way the software does.
          </h1>
          <p className={css.sub}>
            Every resume builder promises to be ATS-friendly. None of them show
            you the evidence. This one exports your resume, reads it back with
            the same extraction tools hiring systems use, and shows you which
            fields survived.
          </p>
          <div className={css.actions}>
            <Link className={css.btnPrimary} href="/check">
              Check your resume
            </Link>
            <Link className={css.btnGhost} href="/builder">
              Build a new one
            </Link>
          </div>

          {/* The hero demonstrates rather than describes. */}
          <div className={css.demo}>
            <div className={css.demoPane}>
              <p className={css.demoLabel}>What a person reads</p>
              <div className={css.miniPaper}>
                <div className={css.miniName}>Alex Mercer</div>
                <div className={css.miniMuted}>
                  alex.mercer@example.com · Austin, TX
                </div>
                <div className={css.miniHead}>Experience</div>
                <div className={css.miniRow}>
                  <strong>Senior Backend Engineer</strong>
                  <span className={css.miniMuted}>Mar 2021 – Present</span>
                </div>
                <div className={css.miniMuted}>Northwind Payments</div>
              </div>
            </div>

            <div className={css.demoPane}>
              <p className={css.demoLabel}>What the parser recovered</p>
              <div className={css.parseList}>
                <div className={css.parseRow}>
                  <span className={css.parseKey}>name</span>
                  <span className={css.parseVal}>Alex Mercer</span>
                </div>
                <div className={css.parseRow}>
                  <span className={css.parseKey}>email</span>
                  <span className={css.parseVal}>alex.mercer@example.com</span>
                </div>
                <div className={css.parseRow}>
                  <span className={css.parseKey}>role[0]</span>
                  <span className={css.parseVal}>Senior Backend Engineer</span>
                </div>
                <div className={css.parseRowMissing}>
                  <span className={css.parseKey}>org[0]</span>
                  <span className={css.parseValMissing}>not recovered</span>
                </div>
                <div className={css.parseRowMissing}>
                  <span className={css.parseKey}>end[0]</span>
                  <span className={css.parseValMissing}>not recovered</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className={css.points}>
          <div className={css.point}>
            <h2>Nothing leaves your browser</h2>
            <p>
              Your resume is stored on your own machine and is never uploaded.
              There is no account to create and no email to hand over. The
              source is public, so you can check that this is true.
            </p>
          </div>
          <div className={css.point}>
            <h2>Every setting is yours</h2>
            <p>
              Font, size, spacing, margins, rules, alignment, bullet style — all
              of it is exposed and editable. Themes are plain JSON files you can
              export and share.
            </p>
          </div>
          <div className={css.point}>
            <h2>Measured, not asserted</h2>
            <p>
              Checks report what actually happened to your document during
              extraction, and the basis for each one is published. The score is
              capped at 98, because no parser is guaranteed.
            </p>
          </div>
        </section>

        <footer className={css.foot}>
          <span>Free, unlimited exports. PDF and Word.</span>
          <Link href="/check">Check a resume →</Link>
        </footer>
      </div>
    </div>
  );
}
