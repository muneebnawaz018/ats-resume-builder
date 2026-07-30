import { url } from "@/lib";
import { CheckerTool, PageShell, Words } from "@/ui/site";
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
          {/*
            One column. The tool used to sit in the right half of a two-column
            hero, which left the report competing with the copy for width, and
            a report about column damage should not be set in columns.
          */}
          <header className={css.checkHero}>
            <div className={`${css.checkIntro} enter`}>
              <p className={css.eyebrow}>Runs entirely in your browser</p>
              <h1 className={css.headline}>
                <Words text="Does your resume survive the parser?" />
              </h1>
              <p className={css.intro}>
                Drop in whatever you already have. It is read the way hiring
                software reads it, and you get told what came through, what did
                not, and what to change.
              </p>
              <p className={css.note}>
                Reads PDF, Word, OpenDocument, rich text and plain text.
                Nothing is uploaded. The file never leaves this tab.
              </p>
            </div>

            <div className="enter-settle">
              <CheckerTool />
            </div>
          </header>
        </div>
      </div>

    </PageShell>
  );
}
