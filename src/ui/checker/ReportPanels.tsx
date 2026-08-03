import type { recoverFields } from "@/extract";
import type { Extraction, Score } from "@/extract";
import { depthNote, formatBytes } from "@/lib";
import type { Picked } from "./Dropzone";
import css from "./console.module.css";

/** Long documents are truncated in the preview, never in the analysis. */
const PREVIEW_LIMIT = 4000;

const SEVERITY_CLASS: Record<Score["deductions"][number]["severity"], string> = {
  blocking: css.sevBlocking,
  high: css.sevHigh,
  medium: css.sevMedium,
  low: css.sevLow,
};

/** Shown in place of the point value. See Deduction.severity. */
const SEVERITY_LABEL: Record<Score["deductions"][number]["severity"], string> = {
  blocking: "Blocking",
  high: "Major",
  medium: "Moderate",
  low: "Minor",
};

export function PanelHead({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: string;
}) {
  return (
    <h2 className={css.panelHead}>
      <span>{children}</span>
      {count ? <span className={css.panelCount}>{count}</span> : null}
    </h2>
  );
}

/**
 * Sits above the score and outside it.
 *
 * A file the portal refuses never reaches a parser, so how well it would have
 * parsed is beside the point until they re-export. The score still renders
 * underneath, because the content advice survives the conversion.
 */
export function Blockers({ blockers }: { blockers: Score["blockers"] }) {
  if (blockers.length === 0) return null;

  return (
    <section className={css.blockers} role="alert">
      {blockers.map((b) => (
        <div key={b.label}>
          <p className={css.blockerLabel}>
            <BlockIcon /> {b.label}
          </p>
          <p className={css.blockerDetail}>{b.detail}</p>
        </div>
      ))}
      <p className={css.note}>
        Fix this first. The score still applies to the content, and carries over
        when you re-export.
      </p>
    </section>
  );
}

/** What a folded row says before it is opened: "4 headings", "3 links". */
const FIELD_NOUNS: Record<string, [string, string]> = {
  links: ["link", "links"],
  sections: ["heading", "headings"],
  dates: ["date range", "date ranges"],
};

function countLabel(key: string, n: number): string {
  const [one, many] = FIELD_NOUNS[key] ?? ["item", "items"];
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * A resume writes "www.site.com/me" as often as it writes the scheme, and a
 * bare host in an href is read as a path off this site. Only http and https
 * get through: a resume is other people's text, and "javascript:" in an href
 * is the oldest trick there is.
 */
function hrefFor(raw: string): string {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : "#";
  } catch {
    return "#";
  }
}

/**
 * The fields a recruiter's screen ends up showing, as a checklist.
 *
 * "Finds", not "recovers". Nothing was repaired: the file was read, and these
 * are the values a parser comes away with.
 */
export function Fields({
  fields,
}: {
  fields: ReturnType<typeof recoverFields>;
}) {
  const found = fields.filter((f) => f.value !== null).length;

  return (
    <section className={css.panel}>
      <PanelHead count={`${found} / ${fields.length}`}>
        What a parser finds
      </PanelHead>

      <dl className={css.fields}>
        {fields.map((f) => {
          const missing = f.value === null;
          return (
            <div key={f.key} className={css.field}>
              <span
                className={missing ? css.markMissing : css.mark}
                aria-hidden="true"
              >
                {missing ? "✕" : "✓"}
              </span>
              <dt className={css.fieldKey}>{f.key}</dt>
              <dd className={missing ? css.fieldLost : css.fieldVal}>
                {missing ? (
                  (f.lost ?? "not found")
                ) : f.items && f.items.length > 1 ? (
                  /*
                   * Folded by default, as a details element so it opens without
                   * state and is in the tab order for free. The list is
                   * numbered: the count in the summary is the claim, and the
                   * numbers are how you check it.
                   */
                  <details className={css.more}>
                    <summary>{countLabel(f.key, f.items.length)}</summary>
                    <ol>
                      {f.items.map((item, i) => (
                        <li key={`${item}-${i}`}>
                          {f.key === "links" ? (
                            <a
                              className={css.fieldLink}
                              href={hrefFor(item)}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              {item}
                            </a>
                          ) : (
                            item
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/**
 * What the file is, measured from the extraction rather than claimed about the
 * format. The name is deliberately absent: it is on the bar above.
 */
export function FileFacts({
  picked,
  result,
}: {
  picked: Picked;
  result: Extraction;
}) {
  const words = result.text.trim() ? result.text.trim().split(/\s+/).length : 0;

  const facts: [string, string][] = [
    ["format", picked.format.label],
    ["size", formatBytes(picked.file.size)],
    ...(result.pages
      ? ([["pages", String(result.pages)]] as [string, string][])
      : []),
    // Only PDFs carry the notion, so the row is absent rather than guessed at
    // for a format where it would always read "yes".
    ...(result.hasTextLayer === undefined
      ? []
      : ([
          ["text layer", result.hasTextLayer ? "readable" : "none"],
        ] as [string, string][])),
    ["words", words.toLocaleString()],
    ["blocks", String(result.blocks.length)],
  ];

  return (
    <section className={css.panel}>
      <PanelHead>What was read</PanelHead>
      <dl className={css.facts}>
        {facts.map(([k, v]) => (
          <div key={k} className={css.fact}>
            <dt className={css.factKey}>{k}</dt>
            <dd className={css.factVal}>{v}</dd>
          </div>
        ))}
      </dl>
      {/* Which checks this format can support at all, so a skipped check is
          never mistaken for a passed one. */}
      <p className={css.note}>{depthNote(result.depth)}</p>
    </section>
  );
}

export function Findings({
  score,
  result,
}: {
  score: Score;
  result: Extraction;
}) {
  const n = score.deductions.length;

  return (
    <section className={css.panel}>
      <PanelHead count={n ? `${n} to fix` : undefined}>
        {n ? "What is costing you points" : "Nothing to change"}
      </PanelHead>

      {n ? (
        <ul className={css.findings}>
          {score.deductions.map((d) => (
            <li
              key={d.label}
              className={`${css.finding} ${SEVERITY_CLASS[d.severity]}`}
            >
              {/*
                Severity, not the point value. The weights are the one part of
                the scoring that is ours rather than cited, and publishing a
                price list invites tuning the number instead of fixing the
                document. The order still reflects the weights exactly.
              */}
              <span className={css.sev}>{SEVERITY_LABEL[d.severity]}</span>
              <span className={css.findingLabel}>{d.label}</span>
              <p className={css.findingBody}>{d.detail}</p>
              <a
                className={css.findingSource}
                href={d.basis.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {d.basis.source} ↗
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className={css.clean}>
          <span aria-hidden="true">✓</span> Nothing in this file is likely to
          confuse a parser.
        </p>
      )}

      {score.skipped.length ? (
        <p className={css.note}>
          Not scored, because this format cannot fail them:{" "}
          {score.skipped.join(", ").toLowerCase()}. {depthNote(result.depth)}
        </p>
      ) : null}

      {score.sources.length ? (
        <details className={css.disclose}>
          <summary>Where these weights come from</summary>
          <ul className={css.sources}>
            {score.sources.map((b) => (
              <li key={b.url + b.claim}>
                <p className={css.sourceClaim}>{b.claim}</p>
                <a href={b.url} target="_blank" rel="noopener noreferrer">
                  {b.source} ↗
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/*
        The extracted text itself, because every claim above is checkable
        against it. A report that cannot be audited is asking to be trusted.
      */}
      <details className={css.disclose}>
        <summary>The text exactly as it came out</summary>
        <pre>{result.text.slice(0, PREVIEW_LIMIT) || "(nothing)"}</pre>
      </details>
    </section>
  );
}

function BlockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
