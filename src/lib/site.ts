/**
 * One place for anything that has to agree across metadata, structured data,
 * the sitemap and robots.txt. Duplicating the URL across those four is how a
 * canonical ends up pointing at the wrong host.
 *
 * Set NEXT_PUBLIC_SITE_URL at build time when the domain is decided; until
 * then the placeholder keeps the shape correct and the output valid.
 */
export const site = {
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://atsproof.com"
  ).replace(/\/$/, ""),
  name: "ATS Resume Builder",
  shortName: "ATS Resume Builder",
  locale: "en_US",
  description:
    "Build a resume, export it, then read it back the way hiring software does. Free, unlimited PDF and Word exports, and your resume never leaves your browser.",
} as const;

/*
 * `trailingSlash: true` means the served URL, and therefore the canonical
 * Next emits, always ends in a slash. The sitemap has to agree, or every
 * entry points at a URL that redirects to the canonical one.
 */
export function url(path: string): string {
  if (path === "/") return `${site.url}/`;
  // Files keep their own name: /sitemap.xml is not a directory.
  if (path.split("/").pop()?.includes(".")) return `${site.url}${path}`;
  return `${site.url}${path}/`;
}
