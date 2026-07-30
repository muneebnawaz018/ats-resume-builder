import type { ReactNode } from "react";
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
  children,
}: {
  kicker: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <PageShell nav="other" footer="bar">
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
