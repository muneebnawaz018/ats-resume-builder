import type { ReactNode } from "react";
import { url } from "@/lib";
import { PageShell } from "@/ui/site";
import css from "@/ui/site/site.module.css";

/**
 * Terms and Privacy are the same document with different words: a kicker, a
 * title, a revision date, then prose. They were two copies of that layout.
 *
 * The revision date is a prop rather than a build-time value on purpose, it
 * says when the terms last changed, not when the site was last deployed.
 */
export function LegalView({
  kicker,
  title,
  updated,
  path,
  children,
}: {
  kicker: string;
  title: string;
  updated: string;
  /** Route this document is served at, for the breadcrumb trail. */
  path: string;
  children: ReactNode;
}) {
  /* Breadcrumbs give the SERP entry a path instead of a bare URL. */
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: url("/") },
      { "@type": "ListItem", position: 2, name: title, item: url(path) },
    ],
  };

  return (
    <PageShell nav="other" footer="bar">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <div className={css.wrap}>
        <article className={css.legal}>
          <p className={css.kicker}>{kicker}</p>
          <h1 className={css.h2}>{title}</h1>
          <p className={css.legalMeta}>Last updated {updated}</p>
          {children}
        </article>
      </div>
    </PageShell>
  );
}
