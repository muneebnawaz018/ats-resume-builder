import type { RichText as RichTextValue } from "@/schema";

/**
 * Renders the constrained rich text model. Bold, italic and link only —
 * the same three marks the DOCX serialiser can express as run properties.
 */
export function RichText({ value }: { value: RichTextValue }) {
  return (
    <>
      {value.spans.map((span, i) => {
        let node: React.ReactNode = span.text;
        if (span.bold) node = <strong>{node}</strong>;
        if (span.italic) node = <em>{node}</em>;
        if (span.href) {
          node = (
            <a href={span.href} rel="noreferrer">
              {node}
            </a>
          );
        }
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}
