import { unzipSync, strFromU8 } from "fflate";

/**
 * .docx and .odt are both zips of XML. fflate does the inflating in about
 * eight kilobytes, which is the whole reason it is here rather than a general
 * office-document library.
 */
export type Archive = Record<string, Uint8Array>;

export function openZip(bytes: Uint8Array): Archive {
  try {
    return unzipSync(bytes);
  } catch {
    throw new Error(
      "That file is damaged. It has the right extension but does not open as a document.",
    );
  }
}

/**
 * Reads an entry as UTF-8 text.
 *
 * Paths are matched case-insensitively: the OOXML spec is case-sensitive, but
 * files produced by older exporters ship "Word/Document.xml" and still open in
 * Word, so refusing them would be stricter than the format is in practice.
 */
export function readEntry(zip: Archive, path: string): string | null {
  const direct = zip[path];
  if (direct) return strFromU8(direct);

  const wanted = path.toLowerCase();
  for (const key of Object.keys(zip)) {
    if (key.toLowerCase() === wanted) return strFromU8(zip[key]);
  }
  return null;
}

/** Every entry whose path matches, in sorted order so runs are repeatable. */
export function readMatching(zip: Archive, re: RegExp): string[] {
  return Object.keys(zip)
    .filter((k) => re.test(k))
    .sort()
    .map((k) => strFromU8(zip[k]));
}
