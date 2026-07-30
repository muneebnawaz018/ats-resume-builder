import Link from "next/link";
import { site, url } from "@/lib";
import {
  Band,
  DemoCard,
  DemoPane,
  PageShell,
  ParseList,
  type ParseField,
  SectionHead,
  Words,
} from "@/ui/site";
import css from "@/ui/site/site.module.css";

/** Small inline glyphs. Inline SVG costs no request and inherits colour. */
const icons = {
  edit: (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 14.5V17h2.5l8.4-8.4-2.5-2.5L3 14.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12.6 4.9 15.1 7.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  scan: (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6.5V4a1 1 0 0 1 1-1h2.5M17 6.5V4a1 1 0 0 0-1-1h-2.5M3 13.5V16a1 1 0 0 0 1 1h2.5M17 13.5V16a1 1 0 0 1-1 1h-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  sliders: (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="6" r="2.2" fill="currentColor" />
      <circle cx="13" cy="14" r="2.2" fill="currentColor" />
    </svg>
  ),
  download: (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3v9m0 0 3.2-3.2M10 12 6.8 8.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 14v1.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  lock: (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4.5" y="8.5" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8.5V6.5a3 3 0 1 1 6 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  layers: (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m10 3 7 3.5-7 3.5-7-3.5L10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m3 11 7 3.5L17 11" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
};

/*
 * Structured data. The FAQ block mirrors the questions rendered further down —
 * Google requires the answer text to match what a visitor sees, so these are
 * the same strings, not a summary of them.
 */
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    [
      "Will an ATS reject my resume for formatting?",
      "Usually not directly. What happens is worse in a quiet way: the file is parsed badly, and a recruiter sees a record with fields missing. You are competing against candidates whose records came through complete.",
    ],
    [
      "PDF or Word?",
      "Send what the posting asks for. If it does not say, PDF is safer because it carries its own fonts and cannot reflow. Both export cleanly here, and both are checked the same way.",
    ],
    [
      "Is one page still the rule?",
      "Under roughly ten years of experience, yes in the US and UK. Beyond that two pages is normal. In Germany and much of Asia longer is expected. This is convention, not a parser constraint, so it is flagged as a suggestion.",
    ],
    [
      "Do keywords from the job posting help?",
      "Matching real terms helps, since recruiters search on them. Stuffing does not — it is obvious to a human reader and to modern matching, and it costs you the interview.",
    ],
    [
      "What happens if I clear my browser?",
      "Your resume is gone, because it was only ever stored on your machine. Export the JSON if you want a backup. That is the trade for never uploading anything.",
    ],
    [
      "How will you make money?",
      "Currently there is no plan to. The core will stay free. If that ever changes it will not be by paywalling the download, because that is the thing this exists to avoid.",
    ],
  ].map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const APP_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: site.name,
  url: url("/"),
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any browser",
  description: site.description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Resume editor with live preview",
    "PDF and Word export",
    "Parser check on an existing resume",
    "Browser-only storage, no account",
  ],
};

/** The hero example: a resume that reads fine and parses badly. */
const HERO_FIELDS: ParseField[] = [
  { key: "name", value: "Alex Mercer" },
  { key: "email", value: "alex.mercer@…" },
  { key: "role[0]", value: "Senior Backend Eng…" },
  { key: "org[0]", value: null },
  { key: "end[0]", value: null },
];

/** What the tool does, paired with what that means in practice. */
const CAPABILITIES = [
  ["Full editor", "Sections, items and bullets, with undo on every change."],
  ["Live preview", "The page you are editing is the page that exports."],
  ["Themes", "Fonts, spacing, rules and colour, saved with the document."],
  ["PDF export", "Real text, selectable and extractable — not an image."],
  ["Autosave", "Saves as you type, in your browser, without an account."],
  ["Portable data", "The whole resume exports as JSON and imports back."],
] as const;

/**
 * Static. No MUI, no client components — this route ships almost no JS and
 * carries its content in the initial HTML response. Verify with `curl`.
 *
 * The page explains rather than advertises: what an applicant tracking system
 * does to a resume, which specific things break it, and what this tool does
 * about each one.
 */
export function HomeView() {
  return (
    <PageShell nav="home">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSONLD) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      {/* ---------- hero ---------- */}
      <div className={css.band}>
        <div className={css.wrap}>
          <header className={css.hero}>
            <div className={`${css.heroCopy} enter`}>
              <p className={css.eyebrow}>
                Free · No account · Nothing uploaded
              </p>
              <h1 className={css.headline}>
                <Words text="See your resume the way the software does." />
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
              <ul className={css.trust}>
                {[
                  "Free, and unlimited",
                  "No sign-up",
                  "Nothing leaves your browser",
                ].map((t) => (
                  <li key={t} className={css.trustItem}>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <DemoCard
              className="enter-settle"
              title="The same document, read two ways"
              footer="This resume looks fine. The employer was placed in a table cell and the end date in a text box, so neither came through. The recruiter sees a role with no company and no end date."
            >
              <DemoPane label="What a person reads">
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
              </DemoPane>

              <DemoPane label="What the parser recovered">
                <ParseList fields={HERO_FIELDS} />
              </DemoPane>
            </DemoCard>
          </header>
        </div>
      </div>

      {/* ---------- what this site actually does ---------- */}
      <div className={css.band} id="what">
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={`${css.sectionHead} reveal`}>
              <p className={css.kicker}>What this site does</p>
              <h2 className={css.h2}>Six things, all of them free</h2>
              <p className={css.sectionIntro}>
                This is a resume editor and a parser check in one place. You
                write the resume, watch the page update as you type, and export
                a file that machines can actually read. Nothing is held back
                behind a payment step.
              </p>
            </div>

            <div className={`${css.features} reveal-stagger`}>
              <div className={css.feature}>
                <span className={css.featureIcon}>{icons.edit}</span>
                <h3 className={css.featureTitle}>Write it here</h3>
                <p className={css.featureBody}>
                  Add jobs, education, skills, projects and anything else you
                  need. Reorder sections, hide the ones you do not want, and
                  rename headings. Every field explains why it matters, so you
                  are not guessing at what a recruiter expects.
                </p>
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
              </div>

              <div className={css.feature}>
                <span className={css.featureIcon}>{icons.download}</span>
                <h3 className={css.featureTitle}>Export as often as you want</h3>
                <p className={css.featureBody}>
                  PDF and Word, with no credit system and no account wall at
                  the download step. Tailor a version per application and
                  export each one.
                </p>
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
              </div>

              <div className={css.feature}>
                <span className={css.featureIcon}>{icons.layers}</span>
                <h3 className={css.featureTitle}>Fix what is flagged</h3>
                <p className={css.featureBody}>
                  Checks name the specific place in your document and what to
                  change — a missing end date on a particular job, not a rule
                  number. Where a fix is mechanical, one click applies it.
                </p>
              </div>

              <div className={css.feature}>
                <span className={css.featureIcon}>{icons.lock}</span>
                <h3 className={css.featureTitle}>Keep it to yourself</h3>
                <p className={css.featureBody}>
                  Everything is stored in your browser. No sign-up, no email, no
                  server holding your employment history. Export the whole thing
                  as a JSON file whenever you want a backup.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ---------- pipeline ---------- */}
      <div className={`${css.band} ${css.bandTint}`} id="how">
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={`${css.sectionHead} reveal`}>
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

            <div className={`${css.steps} reveal-stagger`}>
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
            <div className={`${css.sectionHead} reveal`}>
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

      {/* ---------- check an existing resume ---------- */}
      <div className={`${css.band} ${css.bandTint}`} id="check">
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={css.split}>
              <div className={`${css.splitCopy} reveal`}>
                <p className={css.kicker}>Already have one</p>
                <h2 className={css.h2}>Check the resume you are sending now</h2>
                <p className={css.sectionIntro}>
                  You do not have to rebuild anything. Point the checker at the
                  PDF or Word file you already send out and it reads the file
                  back the way hiring software does, then reports what survived
                  and what did not.
                </p>
                <ul className={css.trust} style={{ margin: "1.5rem 0 0" }}>
                  {[
                    "Runs in this tab",
                    "Nothing uploaded",
                    "Run it as often as you like",
                  ].map((t) => (
                    <li key={t} className={css.trustItem}>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`${css.demo} reveal`}>
                <p className={css.demoHead}>What the report tells you</p>
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
                        <span
                          className={`${css.parseVal} ${css.parseValMissing}`}
                        >
                          in a table
                        </span>
                      </div>
                      <div className={`${css.parseRow} ${css.parseRowMissing}`}>
                        <span className={css.parseKey}>end[0]</span>
                        <span
                          className={`${css.parseVal} ${css.parseValMissing}`}
                        >
                          in a text box
                        </span>
                      </div>
                      <div className={`${css.parseRow} ${css.parseRowMissing}`}>
                        <span className={css.parseKey}>skills</span>
                        <span
                          className={`${css.parseVal} ${css.parseValMissing}`}
                        >
                          column merged
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className={css.demoFoot}>
                  Each finding names the place in your document and what to
                  change, not a rule number.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ---------- why this exists ---------- */}
      <div className={css.band} id="why">
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={`${css.sectionHead} reveal`}>
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

            <div className={`${css.cols} reveal-stagger`}>
              <div className={css.card}>
                <h3 className={css.cardTitle}>The download is free</h3>
                <p className={css.cardBody}>
                  Most builders let you compose a resume and then ask for
                  payment at the point you try to download it. That is the
                  single most common complaint about the category.
                </p>
                <p className={css.cardBody}>
                  Here, export is unlimited and needs no account, and there is
                  no credit system.
                </p>
              </div>

              <div className={css.card}>
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

              <div className={css.card}>
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
      <div className={`${css.band} ${css.bandTint}`} id="faq">
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={`${css.sectionHead} reveal`}>
              <p className={css.kicker}>Questions</p>
              <h2 className={css.h2}>Reasonable things to ask</h2>
            </div>

            <dl className={`${css.faq} reveal-stagger`}>
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

      {/* ---------- closing call to action ---------- */}
      <div className={css.band}>
        <div className={css.wrap}>
          <section className={css.section}>
            <div className={`${css.cta} reveal`}>
              <div className={css.ctaCopy}>
                <p className={css.kicker}>Start here</p>
                <h2 className={css.h2}>
                  Everything you need is on this page
                </h2>
                <p className={css.sectionIntro}>
                  Open the builder and start typing. Nothing to install, no
                  account, and the file you download is yours.
                </p>
              </div>

              <ul className={css.ctaList}>
                {CAPABILITIES.map(([name, note]) => (
                  <li key={name} className={css.ctaItem}>
                    <span className={css.ctaTick} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 8.5 6.2 11.7 13 5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className={css.ctaName}>{name}</span>
                    <span className={css.ctaNote}>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>

    </PageShell>
  );
}
