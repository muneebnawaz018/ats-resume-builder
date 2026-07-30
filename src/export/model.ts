import { formatDateRange } from "@/lib";
import { plainText, type Resume, type Section } from "@/schema";

/**
 * One flat reading of a resume, shared by every writer.
 *
 * Word, OpenDocument, RTF, Markdown and plain text all need the same
 * sequence, name, contact line, then heading-and-entries, and each one of
 * them getting there on its own is how five exports end up disagreeing about
 * whether the location goes before or after the phone number.
 *
 * Everything here is display text. Structure that matters to a parser is
 * carried by the writers as real headings and paragraphs, never by fake
 * bolding or a table.
 */
export type Line =
  | { kind: "name"; text: string }
  | { kind: "headline"; text: string }
  | { kind: "contact"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "entryTitle"; text: string }
  | { kind: "entryMeta"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "body"; text: string };

function dates(start: unknown, end: unknown): string {
  const range = formatDateRange(
    start as Parameters<typeof formatDateRange>[0],
    end as Parameters<typeof formatDateRange>[1],
  );
  return range;
}

/** Title on one line, employer and dates on the next. */
function entry(title: string, meta: string[], out: Line[]) {
  if (title) out.push({ kind: "entryTitle", text: title });
  const line = meta.filter(Boolean).join(" · ");
  if (line) out.push({ kind: "entryMeta", text: line });
}

function sectionLines(section: Section, out: Line[]) {
  const visible = section.items.filter(
    (i) => (i as { visible?: boolean }).visible !== false,
  );
  if (!visible.length) return;

  out.push({ kind: "heading", text: section.title });

  for (const item of visible) {
    switch (section.type) {
      case "experience": {
        const i = item as Extract<Section["items"][number], { role: string }>;
        entry(i.role, [i.organization, i.location ?? "", dates(i.start, i.end)], out);
        for (const b of i.bullets) {
          const text = plainText(b).trim();
          if (text) out.push({ kind: "bullet", text });
        }
        break;
      }
      case "projects": {
        const i = item as Extract<Section["items"][number], { name: string }>;
        entry(i.name, [i.url ?? "", dates(i.start, i.end)], out);
        for (const b of i.bullets) {
          const text = plainText(b).trim();
          if (text) out.push({ kind: "bullet", text });
        }
        break;
      }
      case "education": {
        const i = item as Extract<Section["items"][number], { degree: string }>;
        entry(i.degree, [i.institution, i.location ?? "", dates(i.start, i.end)], out);
        for (const d of i.detail) {
          const text = plainText(d).trim();
          if (text) out.push({ kind: "bullet", text });
        }
        break;
      }
      case "skills": {
        const i = item as Extract<Section["items"][number], { label: string }>;
        const list = i.items.join(", ");
        if (!list) break;
        // Label and list on one line: a parser matching on a skill name finds
        // it either way, and two lines wastes a third of the section.
        out.push({
          kind: "body",
          text: i.label ? `${i.label}: ${list}` : list,
        });
        break;
      }
      case "text": {
        const i = item as Extract<Section["items"][number], { body: unknown }>;
        const text = plainText(i.body as Parameters<typeof plainText>[0]).trim();
        if (text) out.push({ kind: "body", text });
        break;
      }
      default: {
        const i = item as Extract<Section["items"][number], { title: string }>;
        if (!("title" in i)) break;
        entry(i.title, [i.subtitle ?? "", i.date ? dates(i.date, undefined) : ""], out);
        const detail = i.detail ? plainText(i.detail).trim() : "";
        if (detail) out.push({ kind: "body", text: detail });
        break;
      }
    }
  }
}

export function toLines(resume: Resume): Line[] {
  const out: Line[] = [];
  const b = resume.basics;

  if (b.fullName) out.push({ kind: "name", text: b.fullName });
  if (b.headline) out.push({ kind: "headline", text: b.headline });

  const contact = [b.email, b.phone, b.location, ...b.links.map((l) => l.url)]
    .filter(Boolean)
    .join(" · ");
  if (contact) out.push({ kind: "contact", text: contact });

  const summary = b.summary ? plainText(b.summary).trim() : "";
  if (summary) {
    out.push({ kind: "heading", text: "Summary" });
    out.push({ kind: "body", text: summary });
  }

  for (const section of resume.sections) {
    if (section.visible) sectionLines(section, out);
  }

  return out;
}

/** A filename stem with no extension, safe on every filesystem. */
export function stem(resume: Resume): string {
  const base = resume.basics.fullName || resume.name || "resume";
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "resume"
  );
}
