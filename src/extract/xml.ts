/**
 * A tag scanner, not an XML parser.
 *
 * DOMParser would do this in one line, but it exists only in the browser, and
 * these extractors have to be runnable in a test process without dragging in
 * jsdom. The alternative, a real XML library, is a dependency and a bundle
 * cost for the four element names we actually care about in each format.
 *
 * So: no tree, no namespace resolution, no validation. Events in document
 * order, with attributes, which is everything the extractors ask for. It is
 * also tolerant of the unclosed <br> and <meta> that make HTML not-XML,
 * because nothing here requires tags to balance.
 */

export type XmlEvent =
  | { type: "open"; name: string; attrs: Record<string, string>; self: boolean }
  | { type: "close"; name: string }
  | { type: "text"; text: string };

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(s: string): string {
  if (!s.includes("&")) return s;
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

const ATTR = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let m: RegExpExecArray | null;
  ATTR.lastIndex = 0;
  while ((m = ATTR.exec(raw))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? "");
  }
  return attrs;
}

/** Elements that never have a closing tag in HTML. */
const VOID = new Set([
  "br",
  "hr",
  "img",
  "meta",
  "link",
  "input",
  "source",
  "col",
  "area",
  "base",
  "embed",
  "param",
  "track",
  "wbr",
]);

export function* scan(xml: string): Generator<XmlEvent> {
  let i = 0;
  const len = xml.length;

  while (i < len) {
    const lt = xml.indexOf("<", i);
    if (lt === -1) {
      const tail = xml.slice(i);
      if (tail) yield { type: "text", text: decodeEntities(tail) };
      return;
    }
    if (lt > i) {
      yield { type: "text", text: decodeEntities(xml.slice(i, lt)) };
    }

    // Comments, doctypes and CDATA are skipped as units, a naive search for
    // the next ">" lands inside them and desynchronises everything after.
    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt + 4);
      i = end === -1 ? len : end + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt + 9);
      const stop = end === -1 ? len : end;
      yield { type: "text", text: xml.slice(lt + 9, stop) };
      i = end === -1 ? len : end + 3;
      continue;
    }
    if (xml.startsWith("<!", lt) || xml.startsWith("<?", lt)) {
      const end = xml.indexOf(">", lt);
      i = end === -1 ? len : end + 1;
      continue;
    }

    const gt = xml.indexOf(">", lt);
    if (gt === -1) {
      // An unterminated tag at the end of a truncated file. Stop rather than
      // emit the remainder as text: half a tag is not content.
      return;
    }

    const inner = xml.slice(lt + 1, gt);
    i = gt + 1;

    if (inner[0] === "/") {
      yield { type: "close", name: inner.slice(1).trim().toLowerCase() };
      continue;
    }

    const selfClosing = inner.endsWith("/");
    const body = selfClosing ? inner.slice(0, -1) : inner;
    const space = body.search(/[\s/]/);
    const name = (space === -1 ? body : body.slice(0, space)).toLowerCase();
    const attrs = space === -1 ? {} : parseAttrs(body.slice(space));

    yield {
      type: "open",
      name,
      attrs,
      self: selfClosing || VOID.has(name),
    };
  }
}

/** The local name with any namespace prefix removed: "w:tbl" becomes "tbl". */
export function local(name: string): string {
  const i = name.indexOf(":");
  return i === -1 ? name : name.slice(i + 1);
}
