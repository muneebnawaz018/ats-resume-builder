import type { Metadata } from "next";
import Link from "next/link";
import css from "../home.module.css";
import { SiteButton } from "../SiteButton";
import { SiteNav } from "../SiteNav";
import { Words } from "../Words";

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

/** Baked at build time. A static export has no request to read a clock on. */
const YEAR = new Date().getFullYear();

export default function CheckPage() {
  return (
    <div className={css.page} data-scroller>
      <SiteNav current="check" />

      <div className={css.band}>
        <div className={css.wrap}>
          <header className={css.hero}>
            <div className={`${css.heroCopy} enter`}>
              <p className={css.eyebrow}>Runs entirely in your browser</p>
              <h1 className={css.headline}>
                <Words text="Does your resume survive the parser?" />
              </h1>
              <p className={css.intro}>
                Drop in a PDF or Word file. It is read the way an applicant
                tracking system reads it, the fields a recruiter would see are
                rebuilt, and you get told what came through and what did not.
              </p>
              <p className={css.leadBody}>
                The file is processed in this tab. It is not sent anywhere, and
                there is no account to create. You can watch the network tab and
                confirm that nothing leaves.
              </p>
              <div className={css.actions}>
                <SiteButton href="/resume-builder" variant="outlined">
                  Build a resume instead
                </SiteButton>
              </div>
              <p className={css.note} style={{ marginTop: "1rem" }}>
                No upload, no account, no limit on how many times you run it.
              </p>
            </div>

            <div className={`${css.demo} enter-settle`}>
              <p className={css.demoHead}>What the report will look like</p>
              <div className={css.demoBody}>
                <div className={css.demoPane}>
                  <p className={css.demoLabel}>Recovered</p>
                  <div className={css.parseList} data-scan>
                    <div className={css.parseRow}>
                      <span className={css.parseKey}>name</span>
                      <span className={css.parseVal}>Alex Mercer</span>
                    </div>
                    <div className={css.parseRow}>
                      <span className={css.parseKey}>email</span>
                      <span className={css.parseVal}>alex.mercer@…</span>
                    </div>
                    <div className={css.parseRow}>
                      <span className={css.parseKey}>phone</span>
                      <span className={css.parseVal}>+1 415 555 0142</span>
                    </div>
                  </div>
                </div>
                <div className={css.demoPane}>
                  <p className={css.demoLabel}>Lost</p>
                  <div className={css.parseList} data-scan>
                    <div className={`${css.parseRow} ${css.parseRowMissing}`}>
                      <span className={css.parseKey}>org[0]</span>
                      <span className={`${css.parseVal} ${css.parseValMissing}`}>
                        in a table
                      </span>
                    </div>
                    <div className={`${css.parseRow} ${css.parseRowMissing}`}>
                      <span className={css.parseKey}>end[0]</span>
                      <span className={`${css.parseVal} ${css.parseValMissing}`}>
                        in a text box
                      </span>
                    </div>
                    <div className={`${css.parseRow} ${css.parseRowMissing}`}>
                      <span className={css.parseKey}>skills</span>
                      <span className={`${css.parseVal} ${css.parseValMissing}`}>
                        column merged
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className={css.demoFoot}>
                Each finding names the specific place in your document and what
                to change, not a rule number.
              </p>
            </div>
          </header>
        </div>
      </div>

      <div className={`${css.band} ${css.bandTint}`}>
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={`${css.sectionHead} reveal`}>
              <p className={css.kicker}>What it will check</p>
              <h2 className={css.h2}>
                Measured against your actual file, not a checklist
              </h2>
              <p className={css.sectionIntro}>
                Anyone can list formatting rules. The part worth building is
                running your document through real extraction and reporting what
                happened to it.
              </p>
            </div>

            <div className={`${css.cols} reveal-stagger`}>
              <div className={`${css.card} ${css.cardAccent}`}>
                <h3 className={css.cardTitle}>Reading order</h3>
                <p className={css.cardBody}>
                  Whether the extracted text comes out in the order a human
                  reads it. This single check catches most of the damage that
                  multi-column layouts cause.
                </p>
              </div>
              <div className={`${css.card} ${css.cardAccent}`}>
                <h3 className={css.cardTitle}>Field recovery</h3>
                <p className={css.cardBody}>
                  Whether your name, contact details and each role&rsquo;s
                  title, employer and dates survive. Reported per field, with
                  misattached data flagged more seriously than missing data.
                </p>
              </div>
              <div className={`${css.card} ${css.cardAccent}`}>
                <h3 className={css.cardTitle}>Text layer</h3>
                <p className={css.cardBody}>
                  Whether the PDF contains real text at all, and whether it
                  extracts cleanly or as replacement characters.
                </p>
              </div>
              <div className={css.card}>
                <h3 className={css.cardTitle}>Structure</h3>
                <p className={css.cardBody}>
                  Layout tables, text boxes, content in page headers, and
                  headings that do not match any name a parser knows.
                </p>
              </div>
              <div className={css.card}>
                <h3 className={css.cardTitle}>Dates</h3>
                <p className={css.cardBody}>
                  Format consistency, ranges that run backwards, bare years
                  where a month is needed, and how the current role is written.
                </p>
              </div>
              <div className={css.card}>
                <h3 className={css.cardTitle}>Not included</h3>
                <p className={css.cardBody}>
                  Compatibility claims about named vendors we have not tested, a
                  perfect score, or anything held back behind payment.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className={css.wrap}>
        <footer className={css.foot}>
          <div className={css.footBar} style={{ marginTop: 0, borderTop: 0 }}>
            <span>© {YEAR} ATS Resume Builder. All rights reserved.</span>
            <span>
              <Link href="/">Home</Link> ·{" "}
              <Link href="/resume-builder">Build a resume</Link>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
