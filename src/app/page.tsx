import Link from "next/link";
import css from "./home.module.css";
import { SiteButton } from "./SiteButton";
import { SiteNav } from "./SiteNav";

/** Small inline glyphs. Inline SVG costs no request and inherits colour. */
const icons = {
  edit: (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 14.5V17h2.5l8.4-8.4-2.5-2.5L3 14.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12.6 4.9 15.1 7.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  scan: (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6.5V4a1 1 0 0 1 1-1h2.5M17 6.5V4a1 1 0 0 0-1-1h-2.5M3 13.5V16a1 1 0 0 0 1 1h2.5M17 13.5V16a1 1 0 0 1-1 1h-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  sliders: (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="6" r="2.2" fill="currentColor" />
      <circle cx="13" cy="14" r="2.2" fill="currentColor" />
    </svg>
  ),
  download: (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3v9m0 0 3.2-3.2M10 12 6.8 8.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 14v1.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  lock: (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4.5" y="8.5" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8.5V6.5a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  layers: (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m10 3 7 3.5-7 3.5-7-3.5L10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m3 11 7 3.5L17 11" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
};

/**
 * Static. No MUI, no client components — this route ships almost no JS and
 * carries its content in the initial HTML response. Verify with `curl`.
 *
 * The page explains rather than advertises: what an applicant tracking system
 * does to a resume, which specific things break it, and what this tool does
 * about each one. Claims that cannot be backed are stated as unbuilt.
 */
export default function HomePage() {
  return (
    <div className={css.page}>
      <SiteNav current="home" />

      {/* ---------- hero ---------- */}
      <div className={css.band}>
        <div className={css.wrap}>
          <header className={css.hero}>
            <div className={css.heroCopy}>
              <p className={css.eyebrow}>
                Free · No account · Nothing uploaded
              </p>
              <h1 className={css.headline}>
                See your resume the way the software does.
              </h1>
              <p className={css.intro}>
                Before a person reads your resume, a machine takes it apart. It
                pulls the text out of your file and tries to work out which
                words are your name, which are job titles, and which are dates.
              </p>
              <p className={css.leadBody}>
                When that goes wrong, nothing announces it. The recruiter opens
                your record and finds an empty employer field, or a job that
                appears to have lasted a month. Every builder claims to prevent
                this. This one exports your resume, reads it back with the same
                kind of extraction tools, and shows you the result field by
                field.
              </p>
              <div className={css.actions}>
                <SiteButton href="/check">Check your resume</SiteButton>
                <SiteButton href="/builder" variant="outlined">
                  Build a new one
                </SiteButton>
                <span className={css.note}>Unlimited PDF and Word exports.</span>
              </div>
            </div>

            <div className={css.demo}>
              <p className={css.demoHead}>The same document, read two ways</p>
              <div className={css.demoBody}>
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
                      <span className={css.parseVal}>alex.mercer@…</span>
                    </div>
                    <div className={css.parseRow}>
                      <span className={css.parseKey}>role[0]</span>
                      <span className={css.parseVal}>Senior Backend Eng…</span>
                    </div>
                    <div className={`${css.parseRow} ${css.parseRowMissing}`}>
                      <span className={css.parseKey}>org[0]</span>
                      <span className={`${css.parseVal} ${css.parseValMissing}`}>
                        not recovered
                      </span>
                    </div>
                    <div className={`${css.parseRow} ${css.parseRowMissing}`}>
                      <span className={css.parseKey}>end[0]</span>
                      <span className={`${css.parseVal} ${css.parseValMissing}`}>
                        not recovered
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className={css.demoFoot}>
                This resume looks fine. The employer was placed in a table cell
                and the end date in a text box, so neither came through. The
                recruiter sees a role with no company and no end date.
              </p>
            </div>
          </header>
        </div>
      </div>

      {/* ---------- what this site actually does ---------- */}
      <div className={css.band} id="what">
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={css.sectionHead}>
              <p className={css.kicker}>What this site does</p>
              <h2 className={css.h2}>Six things, all of them free</h2>
              <p className={css.sectionIntro}>
                This is a resume editor and a parser check in one place. You
                write the resume, watch the page update as you type, and export
                a file that machines can actually read. Nothing is held back
                behind a payment step.
              </p>
            </div>

            <div className={`${css.features} reveal`}>
              <div className={css.feature}>
                <span className={css.featureIcon}>{icons.edit}</span>
                <h3 className={css.featureTitle}>Write it here</h3>
                <p className={css.featureBody}>
                  Add jobs, education, skills, projects and anything else you
                  need. Reorder sections, hide the ones you do not want, and
                  rename headings. Every field explains why it matters, so you
                  are not guessing at what a recruiter expects.
                </p>
                <span className={`${css.featureTag} ${css.featureTagLive}`}>
                  working now
                </span>
              </div>

              <div className={css.feature}>
                <span className={css.featureIcon}>{icons.sliders}</span>
                <h3 className={css.featureTitle}>Control how it looks</h3>
                <p className={css.featureBody}>
                  Font, size, line height, margins, spacing between sections and
                  bullets, heading case, rule weight, date alignment, bullet
                  character. Around thirty-five settings, all live. Start from a
                  preset and change anything you like.
                </p>
                <span className={`${css.featureTag} ${css.featureTagLive}`}>
                  working now
                </span>
              </div>

              <div className={css.feature}>
                <span className={css.featureIcon}>{icons.download}</span>
                <h3 className={css.featureTitle}>Export as often as you want</h3>
                <p className={css.featureBody}>
                  PDF now, Word next. No watermark, no credit system, no account
                  wall at the download step. Tailor a version per application
                  and export each one.
                </p>
                <span className={`${css.featureTag} ${css.featureTagLive}`}>
                  PDF working
                </span>
              </div>

              <div className={css.feature}>
                <span className={css.featureIcon}>{icons.scan}</span>
                <h3 className={css.featureTitle}>See what a parser reads</h3>
                <p className={css.featureBody}>
                  Switch the page into Parse view and the document turns into
                  the list of fields an extractor recovered — your name, each
                  job title, each employer, each date. Anything missing is
                  marked in red.
                </p>
                <span className={css.featureTag}>in progress</span>
              </div>

              <div className={css.feature}>
                <span className={css.featureIcon}>{icons.layers}</span>
                <h3 className={css.featureTitle}>Fix what is flagged</h3>
                <p className={css.featureBody}>
                  Checks name the specific place in your document and what to
                  change — a missing end date on a particular job, not a rule
                  number. Where a fix is mechanical, one click applies it.
                </p>
                <span className={css.featureTag}>planned</span>
              </div>

              <div className={css.feature}>
                <span className={css.featureIcon}>{icons.lock}</span>
                <h3 className={css.featureTitle}>Keep it to yourself</h3>
                <p className={css.featureBody}>
                  Everything is stored in your browser. No sign-up, no email, no
                  server holding your employment history. Export the whole thing
                  as a JSON file whenever you want a backup.
                </p>
                <span className={`${css.featureTag} ${css.featureTagLive}`}>
                  working now
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ---------- pipeline ---------- */}
      <div className={`${css.band} ${css.bandTint}`} id="how">
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={css.sectionHead}>
              <p className={css.kicker}>What happens to your file</p>
              <h2 className={css.h2}>
                Four steps, and three of them can lose your data
              </h2>
              <p className={css.sectionIntro}>
                Applicant tracking systems — Workday, Taleo, Greenhouse, Lever,
                iCIMS and others — all follow roughly this sequence. They differ
                in the details, and none of them publish how they work.
              </p>
            </div>

            <div className={`${css.steps} reveal`}>
              <div className={css.step}>
                <p className={css.stepNum}>01</p>
                <h3 className={css.stepTitle}>Text extraction</h3>
                <p className={css.stepBody}>
                  The file is opened and its text pulled out as one long stream.
                  A resume saved as an image has nothing to extract, so it
                  arrives empty.
                </p>
              </div>
              <div className={css.step}>
                <p className={css.stepNum}>02</p>
                <h3 className={css.stepTitle}>Reading order</h3>
                <p className={css.stepBody}>
                  The stream is put in order. Two columns are usually read
                  straight across, so a sidebar gets interleaved with the main
                  text and both become nonsense.
                </p>
              </div>
              <div className={css.step}>
                <p className={css.stepNum}>03</p>
                <h3 className={css.stepTitle}>Section detection</h3>
                <p className={css.stepBody}>
                  Headings are matched against known names. “Experience” is
                  recognised. “Where I&rsquo;ve Made an Impact” is not, and
                  everything under it goes unmapped.
                </p>
              </div>
              <div className={css.step}>
                <p className={css.stepNum}>04</p>
                <h3 className={css.stepTitle}>Field extraction</h3>
                <p className={css.stepBody}>
                  Titles, employers and dates are pulled out of each section.
                  Inconsistent date formats defeat this, and employment length
                  cannot be computed.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ---------- what breaks ---------- */}
      <div className={css.band} id="breaks">
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={css.sectionHead}>
              <p className={css.kicker}>Specifics</p>
              <h2 className={css.h2}>What actually breaks a resume</h2>
              <p className={css.sectionIntro}>
                Not a general warning about “fancy formatting”. These are the
                concrete choices that cause data loss, why each one does it, and
                what this builder does instead.
              </p>
            </div>

            <div className={`${css.tableWrap} reveal`}>
              <table className={css.table}>
                <thead>
                  <tr>
                    <th>The choice</th>
                    <th>What goes wrong</th>
                    <th>What this does instead</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Two columns</td>
                    <td>
                      Text is read left to right across both columns, so your
                      skills list ends up spliced into the middle of a job
                      description.
                    </td>
                    <td className={css.good}>
                      Single column only. There is no multi-column option to
                      turn on.
                    </td>
                  </tr>
                  <tr>
                    <td>Tables for layout</td>
                    <td>
                      The usual trick for right-aligned dates. Cell contents get
                      emitted out of order or dropped entirely, and nothing
                      warns you.
                    </td>
                    <td className={css.good}>
                      Dates are aligned with a right tab stop in Word and
                      flexbox on screen. No tables anywhere in the output.
                    </td>
                  </tr>
                  <tr>
                    <td>Contact details in the page header</td>
                    <td>
                      Many extractors discard the header region before they
                      start, so your email and phone number never arrive.
                    </td>
                    <td className={css.good}>
                      Contact details are part of the document body. Headers
                      hold nothing but an optional page number.
                    </td>
                  </tr>
                  <tr>
                    <td>Icons for phone and email</td>
                    <td>
                      A telephone glyph extracts as an unrecognised character or
                      as nothing, leaving the number without a label.
                    </td>
                    <td className={css.good}>
                      No images or icons in the document. Labels are words.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      Mixed date formats — <span className={css.mono}>2021</span>{" "}
                      here, <span className={css.mono}>03/21</span> there
                    </td>
                    <td>
                      Date-range detection fails, so time in role cannot be
                      calculated. Recruiters filter on that number.
                    </td>
                    <td className={css.good}>
                      Dates are stored as month and year and formatted in one
                      style across the whole document.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      “Current” or a dash instead of{" "}
                      <span className={css.mono}>Present</span>
                    </td>
                    <td>
                      Your current job looks like it has no end date, which some
                      systems read as an unfinished record.
                    </td>
                    <td className={css.good}>
                      One option, labelled Present, written the way parsers
                      recognise most reliably.
                    </td>
                  </tr>
                  <tr>
                    <td>A PDF exported as an image</td>
                    <td>
                      Nothing is extractable at all. The submission arrives
                      blank and there is no signal that anything went wrong.
                    </td>
                    <td className={css.good}>
                      Export goes through the browser&rsquo;s print engine,
                      which always produces a real text layer.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* ---------- why this exists ---------- */}
      <div className={`${css.band} ${css.bandTint}`} id="why">
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={css.sectionHead}>
              <p className={css.kicker}>Why this exists</p>
              <h2 className={css.h2}>
                The differences here are about the business model, not the
                technology
              </h2>
              <p className={css.sectionIntro}>
                The established builders are subscription products. Nothing
                below is difficult to build — it is that a company selling
                monthly access has reasons not to.
              </p>
            </div>

            <div className={`${css.cols} reveal`}>
              <div className={`${css.card} ${css.cardAccent}`}>
                <h3 className={css.cardTitle}>The download is free</h3>
                <p className={css.cardBody}>
                  Most builders let you compose a resume and then ask for
                  payment at the point you try to download it. That is the
                  single most common complaint about the category.
                </p>
                <p className={css.cardBody}>
                  Here, export is unlimited and needs no account. No watermark,
                  no credit system.
                </p>
              </div>

              <div className={`${css.card} ${css.cardAccent}`}>
                <h3 className={css.cardTitle}>Nothing is uploaded</h3>
                <p className={css.cardBody}>
                  Your resume is held in your own browser&rsquo;s storage. There
                  is no server to send it to, no account to create, and no email
                  address to hand over.
                </p>
                <p className={css.cardBody}>
                  The source will be published, so this is a claim you can check
                  rather than one you have to believe.
                </p>
              </div>

              <div className={`${css.card} ${css.cardAccent}`}>
                <h3 className={css.cardTitle}>Every setting is exposed</h3>
                <p className={css.cardBody}>
                  Font, size, line height, margins, section spacing, heading
                  case, rule weight, date alignment, bullet character and indent
                  — all editable, all live.
                </p>
                <p className={css.cardBody}>
                  Templates are locked elsewhere because a fixed template
                  guarantees the output looks acceptable. Themes here are plain
                  JSON files you can export and share.
                </p>
              </div>

              <div className={css.card}>
                <h3 className={css.cardTitle}>Scores are measured</h3>
                <p className={css.cardBody}>
                  There is no industry ATS score. Any number you have been shown
                  was somebody&rsquo;s heuristic presented as a standard.
                </p>
                <p className={css.cardBody}>
                  The plan here is to publish the basis for every check, and to
                  cap the score at 98 — because no parser is guaranteed and
                  claiming otherwise would be a lie.
                </p>
              </div>

              <div className={css.card}>
                <h3 className={css.cardTitle}>Your data stays portable</h3>
                <p className={css.cardBody}>
                  The whole resume exports as JSON and imports back. Nothing
                  locks you in, and if this project stops being maintained you
                  keep everything.
                </p>
              </div>

              <div className={css.card}>
                <h3 className={css.cardTitle}>Advice is regional</h3>
                <p className={css.cardBody}>
                  “Never include a photo” is advice for the US and UK. In
                  Germany, Japan and much of the Gulf a photo is expected.
                  Guidance here follows the market you pick.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ---------- faq ---------- */}
      <div className={css.band} id="faq">
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={css.sectionHead}>
              <p className={css.kicker}>Questions</p>
              <h2 className={css.h2}>Reasonable things to ask</h2>
            </div>

            <dl className={`${css.faq} reveal`}>
              <div>
                <dt className={css.faqQ}>
                  Will an ATS reject my resume for formatting?
                </dt>
                <dd className={css.faqA}>
                  Usually not directly. What happens is worse in a quiet way:
                  the file is parsed badly, and a recruiter sees a record with
                  fields missing. You are competing against candidates whose
                  records came through complete.
                </dd>
              </div>
              <div>
                <dt className={css.faqQ}>PDF or Word?</dt>
                <dd className={css.faqA}>
                  Send what the posting asks for. If it does not say, PDF is
                  safer because it carries its own fonts and cannot reflow. Both
                  export cleanly here, and both are checked the same way.
                </dd>
              </div>
              <div>
                <dt className={css.faqQ}>Is one page still the rule?</dt>
                <dd className={css.faqA}>
                  Under roughly ten years of experience, yes in the US and UK.
                  Beyond that two pages is normal. In Germany and much of Asia
                  longer is expected. This is convention, not a parser
                  constraint, so it is flagged as a suggestion.
                </dd>
              </div>
              <div>
                <dt className={css.faqQ}>
                  Do keywords from the job posting help?
                </dt>
                <dd className={css.faqA}>
                  Matching real terms helps, since recruiters search on them.
                  Stuffing does not — it is obvious to a human reader and to
                  modern matching, and it costs you the interview.
                </dd>
              </div>
              <div>
                <dt className={css.faqQ}>
                  What happens if I clear my browser?
                </dt>
                <dd className={css.faqA}>
                  Your resume is gone, because it was only ever stored on your
                  machine. Export the JSON if you want a backup. That is the
                  trade for never uploading anything.
                </dd>
              </div>
              <div>
                <dt className={css.faqQ}>How will you make money?</dt>
                <dd className={css.faqA}>
                  Currently there is no plan to. The core will stay free. If
                  that ever changes it will not be by paywalling the download,
                  because that is the thing this exists to avoid.
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {/* ---------- honest status ---------- */}
      <div className={`${css.band} ${css.bandTint}`}>
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={css.sectionHead}>
              <p className={css.kicker}>Status</p>
              <h2 className={css.h2}>What is built, and what is not yet</h2>
              <p className={css.sectionIntro}>
                This is early. Listing it plainly is better than letting you
                find out by clicking something that does nothing.
              </p>
              <div className={css.status}>
                <span className={`${css.pill} ${css.pillDone}`}>editor</span>
                <span className={`${css.pill} ${css.pillDone}`}>
                  live preview
                </span>
                <span className={`${css.pill} ${css.pillDone}`}>themes</span>
                <span className={`${css.pill} ${css.pillDone}`}>
                  PDF export
                </span>
                <span className={`${css.pill} ${css.pillDone}`}>
                  local storage
                </span>
                <span className={css.pill}>Word export</span>
                <span className={css.pill}>ATS checks</span>
                <span className={css.pill}>parse round-trip</span>
                <span className={css.pill}>import</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className={css.wrap}>
        <footer className={css.foot}>
          <span>
            Free, unlimited exports. Your resume never leaves this browser.
          </span>
          <span>
            <Link href="/check">Check a resume</Link> ·{" "}
            <Link href="/builder">Open the builder</Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
