/**
 * The link destinations that show up on resumes, and how to recognise them.
 *
 * One registry, used in three places: the importer labels what it finds, the
 * editor offers them as a picker, and the renderer decides how to write each
 * one out. Adding a platform here adds it everywhere.
 *
 * `match` is tested against the URL with any scheme and leading "www." already
 * removed, so patterns start at the host.
 */
export type LinkPlatform = {
  /** Stable id, stored on the link. */
  id: string;
  /** What the editor and the default label call it. */
  label: string;
  match: RegExp;
  /** Prepended when someone types a bare handle rather than a full address. */
  prefix?: string;
  placeholder: string;
};

export const LINK_PLATFORMS: LinkPlatform[] = [
  {
    id: "linkedin",
    label: "LinkedIn",
    match: /^linkedin\.com\//i,
    prefix: "linkedin.com/in/",
    placeholder: "linkedin.com/in/yourname",
  },
  {
    id: "github",
    label: "GitHub",
    match: /^github\.com\//i,
    prefix: "github.com/",
    placeholder: "github.com/yourname",
  },
  {
    id: "gitlab",
    label: "GitLab",
    match: /^gitlab\.com\//i,
    prefix: "gitlab.com/",
    placeholder: "gitlab.com/yourname",
  },
  {
    id: "stackoverflow",
    label: "Stack Overflow",
    match: /^stackoverflow\.com\//i,
    prefix: "stackoverflow.com/users/",
    placeholder: "stackoverflow.com/users/000000/yourname",
  },
  {
    id: "scholar",
    label: "Google Scholar",
    match: /^scholar\.google\./i,
    placeholder: "scholar.google.com/citations?user=…",
  },
  {
    id: "orcid",
    label: "ORCID",
    match: /^orcid\.org\//i,
    prefix: "orcid.org/",
    placeholder: "orcid.org/0000-0000-0000-0000",
  },
  {
    id: "x",
    label: "X",
    match: /^(twitter\.com|x\.com)\//i,
    prefix: "x.com/",
    placeholder: "x.com/yourname",
  },
  {
    id: "dribbble",
    label: "Dribbble",
    match: /^dribbble\.com\//i,
    prefix: "dribbble.com/",
    placeholder: "dribbble.com/yourname",
  },
  {
    id: "behance",
    label: "Behance",
    match: /^behance\.net\//i,
    prefix: "behance.net/",
    placeholder: "behance.net/yourname",
  },
  {
    id: "medium",
    label: "Medium",
    match: /^medium\.com\//i,
    prefix: "medium.com/@",
    placeholder: "medium.com/@yourname",
  },
  {
    id: "kaggle",
    label: "Kaggle",
    match: /^kaggle\.com\//i,
    prefix: "kaggle.com/",
    placeholder: "kaggle.com/yourname",
  },
  {
    id: "youtube",
    label: "YouTube",
    match: /^(youtube\.com|youtu\.be)\//i,
    prefix: "youtube.com/@",
    placeholder: "youtube.com/@yourname",
  },
];

/** Everything that is not one of the above: a personal site. */
export const WEBSITE_PLATFORM: LinkPlatform = {
  id: "website",
  label: "Website",
  match: /.^/,
  placeholder: "yourname.dev",
};

const bareHost = (url: string): string =>
  url
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./i, "");

/** Which platform an address belongs to. Never null: unknown means Website. */
export function classifyLink(url: string): LinkPlatform {
  const host = bareHost(url);
  return LINK_PLATFORMS.find((p) => p.match.test(host)) ?? WEBSITE_PLATFORM;
}

export function platformById(id: string | undefined): LinkPlatform | undefined {
  if (!id) return undefined;
  if (id === WEBSITE_PLATFORM.id) return WEBSITE_PLATFORM;
  return LINK_PLATFORMS.find((p) => p.id === id);
}

/**
 * How one link is written into a document.
 *
 * Always text, never an icon: a glyph carries no address, so an applicant
 * tracking system reads the text layer, finds nothing where the icon sits, and
 * the profile is lost. See the `link-plain-text` rule in docs/04-ats-rules.md.
 *
 * Shared by the on-screen document and every file export, which used to
 * disagree: the PDF honoured `displayAs` and the DOCX always printed the raw
 * address, so the exported file did not match what was on screen.
 */
export function linkText(l: {
  label: string;
  url: string;
  displayAs: "url" | "label" | "both";
}): string {
  if (l.displayAs === "label") return l.label || l.url;
  if (l.displayAs === "both" && l.label) return `${l.label}: ${l.url}`;
  return l.url;
}

/**
 * Turns whatever someone typed into an address worth printing.
 *
 * A bare handle gets the platform's prefix, so typing "muneeb" under GitHub
 * becomes github.com/muneeb. Anything that already looks like an address is
 * left alone apart from a trailing slash.
 */
export function normaliseLinkInput(input: string, platform: LinkPlatform): string {
  const value = input.trim().replace(/\/+$/, "");
  if (!value) return "";
  const host = bareHost(value);
  if (host.includes(".") || host.includes("/")) return host;
  return platform.prefix ? `${platform.prefix}${value.replace(/^@/, "")}` : host;
}
