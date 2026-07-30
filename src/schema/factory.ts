import { newId } from "@/lib";
import { richText } from "./common";
import type { SectionItem, SectionType } from "./resume";

/** Section types the user can add, with the wording most parsers recognise. */
export const ADDABLE_SECTIONS: {
  type: SectionType;
  title: string;
  hint: string;
}[] = [
  {
    type: "experience",
    title: "Experience",
    hint: "Jobs, with dates and what you achieved.",
  },
  {
    type: "education",
    title: "Education",
    hint: "Degrees and qualifications.",
  },
  {
    type: "skills",
    title: "Skills",
    hint: "Grouped lists: languages, tools, methods.",
  },
  {
    type: "projects",
    title: "Projects",
    hint: "Work outside a job: side projects, open source.",
  },
  {
    type: "certifications",
    title: "Certifications",
    hint: "Named credentials and the year you earned them.",
  },
  {
    type: "awards",
    title: "Awards",
    hint: "Recognition worth listing.",
  },
  {
    type: "publications",
    title: "Publications",
    hint: "Papers, articles, talks.",
  },
  {
    type: "languages",
    title: "Languages",
    hint: "Spoken languages and your level.",
  },
  {
    type: "volunteer",
    title: "Volunteering",
    hint: "Unpaid roles worth showing.",
  },
  {
    type: "text",
    title: "Custom section",
    hint: "A heading and a paragraph. Anything the others do not cover.",
  },
];

/** A blank item of the right shape for a section type. */
export function createItem(type: SectionType): SectionItem {
  const id = newId("i");
  switch (type) {
    case "experience":
      return {
        id,
        visible: true,
        role: "",
        organization: "",
        location: "",
        start: undefined,
        end: "present",
        bullets: [richText("")],
        tech: [],
      };
    case "education":
      return {
        id,
        visible: true,
        degree: "",
        institution: "",
        location: "",
        detail: [],
      };
    case "skills":
      return { id, visible: true, label: "", items: [] };
    case "projects":
      return {
        id,
        visible: true,
        name: "",
        url: "",
        bullets: [richText("")],
        tech: [],
      };
    case "text":
      return { id, visible: true, body: richText("") };
    case "custom":
      return { id, visible: true, values: {} };
    default:
      return { id, visible: true, title: "", subtitle: "" };
  }
}

/** Short description shown at the top of a section's editor. */
export const SECTION_HELP: Partial<Record<SectionType, string>> = {
  experience:
    "List roles newest first. Parsers read the dates to work out how long you have been working, so give a month and a year for each one.",
  education:
    "Degrees, newest first. Dates are optional here, and many people leave them off.",
  skills:
    "Group related skills under a label. Keep them as plain comma-separated words; a recruiter search matches on the exact term.",
  projects: "Work that is not a job. Same shape as experience.",
  certifications: "One line each: the credential, who issued it, and the year.",
  languages: "One per line, with your level.",
  text: "A free paragraph under a heading of your choosing.",
};
