import { url } from "@/lib";
import {
  DemoCard,
  DemoPane,
  PageShell,
  ParseList,
  type ParseField,
  SectionHead,
  Words,
} from "@/ui/site";
import css from "@/ui/site/site.module.css";

/** Breadcrumbs give the SERP entry a path instead of a bare URL. */
const CRUMBS = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: url("/") },
    {
      "@type": "ListItem",
      position: 2,
      name: "Resume checker",
      item: url("/resume-checker"),
    },
  ],
};

/** Baked at build time. A static export has no request to read a clock on. */
const YEAR = new Date().getFullYear();


/** What a clean extraction returns. */
const RECOVERED: ParseField[] = [
  { key: "name", value: "Alex Mercer" },
  { key: "email", value: "alex.mercer@…" },
  { key: "phone", value: "+1 415 555 0142" },
];

/** And what a layout table, a text box and a merged column cost you. */
const LOST: ParseField[] = [
  { key: "org[0]", value: null, lost: "in a table" },
  { key: "end[0]", value: null, lost: "in a text box" },
  { key: "skills", value: null, lost: "column merged" },
];

export function CheckerView() {
  return (
    <PageShell nav="check" footer="bar">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(CRUMBS) }}
      />
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
              <p className={css.note} style={{ marginTop: "1rem" }}>
                No upload, no account, no limit on how many times you run it.
              </p>
            </div>

            <DemoCard
              className="enter-settle"
              title="What the report will look like"
              footer="Each finding names the specific place in your document and what to change, not a rule number."
            >
              <DemoPane label="Recovered">
                <ParseList fields={RECOVERED} />
              </DemoPane>
              <DemoPane label="Lost">
                <ParseList fields={LOST} />
              </DemoPane>
            </DemoCard>
          </header>
        </div>
      </div>

      <div className={`${css.band} ${css.bandTint}`}>
        <div className={css.wrap}>
          <section className={css.section}>
            <SectionHead
              kicker="What it will check"
              title="Measured against your actual file, not a checklist"
              intro="Anyone can list formatting rules. The part worth building is running your document through real extraction and reporting what happened to it."
            />

            <div className={`${css.cols} reveal-stagger`}>
              <div className={css.card}>
                <h3 className={css.cardTitle}>Reading order</h3>
                <p className={css.cardBody}>
                  Whether the extracted text comes out in the order a human
                  reads it. This single check catches most of the damage that
                  multi-column layouts cause.
                </p>
              </div>
              <div className={css.card}>
                <h3 className={css.cardTitle}>Field recovery</h3>
                <p className={css.cardBody}>
                  Whether your name, contact details and each role&rsquo;s
                  title, employer and dates survive. Reported per field, with
                  misattached data flagged more seriously than missing data.
                </p>
              </div>
              <div className={css.card}>
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

    </PageShell>
  );
}
