import { Fragment, type CSSProperties } from "react";

/**
 * Splits a headline into per-word masked spans so the line sets itself on
 * load, word by word, instead of fading in as one block.
 *
 * Server component, the split happens in the HTML, so the animation starts on
 * first paint with no hydration wait and no layout shift. Screen readers still
 * read one continuous string because the spaces are preserved between words.
 *
 * The space sits outside the clipping box: a trailing space inside an
 * overflow-hidden inline-block collapses and the words run together.
 */
export function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span className="words">
      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          <span>
            <span style={{ "--i": i } as CSSProperties}>{w}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
