import css from "@/ui/site/site.module.css";

/**
 * A parser's-eye view of a document: field name on the left, what came back on
 * the right, with anything lost marked.
 *
 * Seventeen of these rows were written out by hand across two pages, which
 * meant the missing-state classes had to be repeated correctly every time.
 *
 * `data-scan` opts the list into the read-through animation, each row lights
 * in turn when the list first appears. See ScrollReveal.
 */
export type ParseField = {
  key: string;
  /** What the extractor recovered, or null when the field was lost. */
  value: string | null;
  /** Shown in place of the value when it is null. */
  lost?: string;
};

export function ParseList({ fields }: { fields: readonly ParseField[] }) {
  return (
    <div className={css.parseList} data-scan>
      {fields.map((f) => {
        const missing = f.value === null;
        // Joined rather than interpolated: a template literal leaves a
        // trailing space in the class attribute when the modifier is absent.
        const row = [css.parseRow, missing && css.parseRowMissing]
          .filter(Boolean)
          .join(" ");
        const val = [css.parseVal, missing && css.parseValMissing]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={f.key} className={row}>
            <span className={css.parseKey}>{f.key}</span>
            <span className={val}>
              {missing ? (f.lost ?? "not recovered") : f.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
