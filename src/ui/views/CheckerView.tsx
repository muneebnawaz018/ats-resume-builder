import { url } from "@/lib";
import { CheckerConsole } from "@/ui/checker";
import css from "@/ui/checker/console.module.css";
import { PageShell } from "@/ui/site";

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

/**
 * The checker, as a dark instrument panel.
 *
 * The shell element redefines the surface, text and accent tokens, and the
 * chrome sits inside it, so SiteNav and SiteFooter come along without either
 * of them knowing this route is dark. Everything else on the site stays a
 * light document; this page is a readout, and it is the only one whose whole
 * job is displaying measurements taken from a file.
 */
export function CheckerView() {
  return (
    <div className={css.shell}>
      <PageShell nav="check" footer="bar">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(CRUMBS) }}
        />

        <main className={css.main}>
          <header className={css.masthead}>
            <p className={css.rail}>
              <span className={css.pulse} aria-hidden="true" />
              Runs entirely in your browser
            </p>
            <h1 className={css.title}>
              Read your resume back{" "}
              <span className={css.titleDim}>the way software does</span>
            </h1>
            <p className={css.lede}>
              Drop in whatever you already have. It is read the way hiring
              software reads it, and you get told what came through, what did
              not, and what to change. PDF, Word, OpenDocument, rich text and
              plain text. Nothing is uploaded. The file never leaves this tab.
            </p>
          </header>

          <CheckerConsole />
        </main>
      </PageShell>
    </div>
  );
}
