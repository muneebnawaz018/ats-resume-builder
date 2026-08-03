import Link from "next/link";
import { PageShell } from "@/ui/site";
import css from "@/ui/site/site.module.css";

/**
 * The 404 page.
 *
 * A static export serves this as /404.html, which is what a mistyped or
 * retired URL lands on. Without it the host's own error page appears, with no
 * navigation and no way back into the site, and a crawler that hits a few of
 * those learns nothing about where the real pages are.
 */
export function NotFoundView() {
  return (
    <PageShell nav="other" footer="bar">
      <div className={css.wrap}>
        <article className={css.legal}>
          <p className={css.kicker}>404</p>
          <h1 className={css.h2}>That page is not here</h1>
          <p>
            The address may be mistyped, or the page may have been renamed.
            Everything this site does is on one of these three:
          </p>
          <ul>
            <li>
              <Link href="/">Home</Link>: what the tool is and why it exists.
            </li>
            <li>
              <Link href="/resume-checker">Resume checker</Link>: read an
              existing resume back the way hiring software does.
            </li>
            <li>
              <Link href="/resume-builder">Resume builder</Link>: write one
              that parses cleanly, and export it.
            </li>
          </ul>
        </article>
      </div>
    </PageShell>
  );
}
