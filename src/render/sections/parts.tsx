import type { RichText as RichTextValue } from "@/schema";
import { RichText } from "@/render/RichText";
import css from "../document.module.css";

/** Bullet list. The glyph is real text in the flow so extractors see a marker. */
export function Bullets({
  items,
  bulletChar,
  path,
}: {
  items: RichTextValue[];
  bulletChar: string;
  path: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={css.bullets}>
      {items.map((b, i) => (
        <li className={css.bullet} key={i} data-path={`${path}.bullets[${i}]`}>
          <span className={css.bulletChar} aria-hidden="true">
            {bulletChar}
          </span>
          <span className={css.bulletText}>
            <RichText value={b} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Title on the left, date on the right.
 *
 * Right alignment uses flexbox, never a table. Layout tables are the main
 * reason DOCX exports parse badly; the DOCX serialiser uses a right tab stop
 * for the same reason. See docs/03-architecture.md.
 */
export function ItemHead({
  title,
  subtitle,
  meta,
  dateAlign,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  dateAlign: "inline" | "right";
}) {
  if (dateAlign === "inline") {
    return (
      <div className={css.itemHeadInline}>
        <span className={css.itemTitle}>{title}</span>
        {subtitle ? <span className={css.itemSub}> — {subtitle}</span> : null}
        {meta ? <span className={css.itemMetaInline}> ({meta})</span> : null}
      </div>
    );
  }

  return (
    <>
      <div className={css.itemHead}>
        <span className={css.itemTitle}>{title}</span>
        {meta ? <span className={css.itemMeta}>{meta}</span> : null}
      </div>
      {subtitle ? <div className={css.itemSub}>{subtitle}</div> : null}
    </>
  );
}
