import { z } from "zod";
import { zDateEnd, zDateValue, zRichText } from "./common";

export const RESUME_SCHEMA_VERSION = 1;

export const SECTION_TYPES = [
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "publications",
  "awards",
  "languages",
  "volunteer",
  "references",
  "text",
  "custom",
] as const;
export const zSectionType = z.enum(SECTION_TYPES);
export type SectionType = z.infer<typeof zSectionType>;

const base = { id: z.string(), visible: z.boolean() };

export const zExperienceItem = z.object({
  ...base,
  role: z.string(),
  organization: z.string(),
  location: z.string().optional(),
  start: zDateValue.optional(),
  end: zDateEnd.optional(),
  bullets: z.array(zRichText),
  tech: z.array(z.string()).optional(),
});

export const zEducationItem = z.object({
  ...base,
  degree: z.string(),
  institution: z.string(),
  location: z.string().optional(),
  start: zDateValue.optional(),
  end: zDateValue.optional(),
  detail: z.array(zRichText),
});

export const zSkillGroup = z.object({
  ...base,
  label: z.string(),
  items: z.array(z.string()),
});

export const zProjectItem = z.object({
  ...base,
  name: z.string(),
  url: z.string().optional(),
  start: zDateValue.optional(),
  end: zDateEnd.optional(),
  bullets: z.array(zRichText),
  tech: z.array(z.string()).optional(),
});

/** Certifications, awards, publications, languages, volunteer, references. */
export const zSimpleItem = z.object({
  ...base,
  title: z.string(),
  subtitle: z.string().optional(),
  date: zDateValue.optional(),
  detail: zRichText.optional(),
});

export const zTextItem = z.object({ ...base, body: zRichText });

export const zCustomItem = z.object({
  ...base,
  values: z.record(z.string(), z.unknown()),
});

export const zSectionItem = z.union([
  zExperienceItem,
  zEducationItem,
  zSkillGroup,
  zProjectItem,
  zSimpleItem,
  zTextItem,
  zCustomItem,
]);

export type ExperienceItem = z.infer<typeof zExperienceItem>;
export type EducationItem = z.infer<typeof zEducationItem>;
export type SkillGroup = z.infer<typeof zSkillGroup>;
export type ProjectItem = z.infer<typeof zProjectItem>;
export type SimpleItem = z.infer<typeof zSimpleItem>;
export type TextItem = z.infer<typeof zTextItem>;
export type SectionItem = z.infer<typeof zSectionItem>;

export const zCustomField = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  kind: z.enum(["text", "richtext", "date", "daterange", "url", "list"]),
});

export const zSection = z.object({
  id: z.string(),
  type: zSectionType,
  title: z.string(),
  visible: z.boolean(),
  items: z.array(zSectionItem),
  fieldSchema: z.array(zCustomField).optional(),
  /**
   * Partial theme tokens scoped to this section. Resolved by re-declaring only
   * the overridden CSS custom properties on the section element, so there is no
   * cascade resolution in JS.
   */
  overrides: z.record(z.string(), z.unknown()).optional(),
});
export type Section = z.infer<typeof zSection>;

export const zLink = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
  displayAs: z.enum(["url", "label", "both"]),
  /**
   * Which known destination this is: see schema/links.ts. Optional because
   * documents written before the registry existed have none, and because a
   * personal site belongs to no platform. It only chooses the default label
   * and the editor's hints; the address is always what gets printed.
   */
  platform: z.string().optional(),
});

export const zBasics = z.object({
  fullName: z.string(),
  headline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  /** City and country. A street address is unnecessary personal data. */
  location: z.string().optional(),
  links: z.array(zLink),
  summary: zRichText.optional(),
});

export const JURISDICTIONS = [
  "generic",
  "US",
  "UK",
  "CA",
  "AU",
  "DE",
  "JP",
  "PK",
  "AE",
  "IN",
] as const;
export const zJurisdiction = z.enum(JURISDICTIONS);

export const zResume = z.object({
  schemaVersion: z.number().int(),
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  themeId: z.string(),
  basics: zBasics,
  sections: z.array(zSection),
  meta: z.object({
    targetRole: z.string().optional(),
    targetJobDescription: z.string().optional(),
    jurisdiction: zJurisdiction.default("generic"),
    notes: z.string().optional(),
  }),
});
export type Resume = z.infer<typeof zResume>;
