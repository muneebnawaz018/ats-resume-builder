"use client";

import { plainText, richText } from "@/schema";
import type {
  EducationItem,
  ExperienceItem,
  ProjectItem,
  SectionItem,
  SectionType,
  SimpleItem,
  SkillGroup,
  TextItem,
} from "@/schema";
import { BulletEditor } from "./BulletEditor";
import { DateField, Field, ListField } from "./fields";

type Patch = Record<string, unknown>;

/** Fields for one item, chosen by section type. */
export function ItemEditor({
  type,
  item,
  onPatch,
}: {
  type: SectionType;
  item: SectionItem;
  onPatch: (patch: Patch) => void;
}) {
  switch (type) {
    case "experience": {
      const it = item as ExperienceItem;
      return (
        <>
          <Field
            label="Job title"
            value={it.role}
            onChange={(role) => onPatch({ role })}
            placeholder="Senior Backend Engineer"
            help="The title as it appeared, not an internal grade or level code."
          />
          <Field
            label="Company"
            value={it.organization}
            onChange={(organization) => onPatch({ organization })}
            placeholder="Northwind Payments"
          />
          <Field
            label="Location"
            value={it.location ?? ""}
            onChange={(location) => onPatch({ location })}
            placeholder="Austin, TX"
            help="City and country is enough. A street address is personal data you do not need to give."
          />
          <DateField
            label="Started"
            value={it.start}
            onChange={(start) => onPatch({ start })}
          />
          <DateField
            label="Ended"
            value={it.end}
            allowPresent
            onChange={(end) => onPatch({ end })}
            help="Choose Present for your current job. Parsers recognise that word more reliably than “Current” or a dash."
          />
          <BulletEditor
            bullets={it.bullets}
            onChange={(bullets) => onPatch({ bullets })}
            help="What you achieved, not what you were assigned. Three to six per job."
          />
          <ListField
            label="Tools used"
            value={it.tech ?? []}
            onChange={(tech) => onPatch({ tech })}
            placeholder="Go, PostgreSQL, Kafka"
            help="Optional. Separate with commas. A recruiter search matches the exact word."
          />
        </>
      );
    }

    case "education": {
      const it = item as EducationItem;
      return (
        <>
          <Field
            label="Qualification"
            value={it.degree}
            onChange={(degree) => onPatch({ degree })}
            placeholder="BSc Computer Science"
          />
          <Field
            label="Institution"
            value={it.institution}
            onChange={(institution) => onPatch({ institution })}
            placeholder="University of Texas at Austin"
          />
          <Field
            label="Location"
            value={it.location ?? ""}
            onChange={(location) => onPatch({ location })}
          />
          <DateField
            label="Started"
            value={it.start}
            onChange={(start) => onPatch({ start })}
          />
          <DateField
            label="Finished"
            value={it.end}
            onChange={(end) =>
              onPatch({ end: end === "present" ? undefined : end })
            }
          />
          <BulletEditor
            label="Details"
            bullets={it.detail}
            onChange={(detail) => onPatch({ detail })}
            help="Optional: honours, a thesis title, relevant coursework."
          />
        </>
      );
    }

    case "skills": {
      const it = item as SkillGroup;
      return (
        <>
          <Field
            label="Group name"
            value={it.label}
            onChange={(label) => onPatch({ label })}
            placeholder="Languages"
            help="Grouping reads better than one long list, and keeps related terms together."
          />
          <ListField
            label="Skills"
            value={it.items}
            onChange={(items) => onPatch({ items })}
            placeholder="Go, Python, TypeScript, SQL"
            help="Separate with commas. Write them the way a job posting would."
          />
        </>
      );
    }

    case "projects": {
      const it = item as ProjectItem;
      return (
        <>
          <Field
            label="Project name"
            value={it.name}
            onChange={(name) => onPatch({ name })}
          />
          <Field
            label="Link"
            value={it.url ?? ""}
            onChange={(url) => onPatch({ url })}
            placeholder="github.com/you/project"
            help="Write the address out in full. Shortened links and link-only text often extract as nothing."
          />
          <DateField
            label="Started"
            value={it.start}
            onChange={(start) => onPatch({ start })}
          />
          <DateField
            label="Ended"
            value={it.end}
            allowPresent
            onChange={(end) => onPatch({ end })}
          />
          <BulletEditor
            bullets={it.bullets}
            onChange={(bullets) => onPatch({ bullets })}
          />
          <ListField
            label="Tools used"
            value={it.tech ?? []}
            onChange={(tech) => onPatch({ tech })}
          />
        </>
      );
    }

    case "text": {
      const it = item as TextItem;
      return (
        <Field
          label="Text"
          value={plainText(it.body)}
          onChange={(v) => onPatch({ body: richText(v) })}
          multiline
          rows={4}
        />
      );
    }

    default: {
      const it = item as SimpleItem;
      return (
        <>
          <Field
            label="Title"
            value={it.title}
            onChange={(title) => onPatch({ title })}
            placeholder="AWS Solutions Architect"
          />
          <Field
            label="Issued by"
            value={it.subtitle ?? ""}
            onChange={(subtitle) => onPatch({ subtitle })}
            placeholder="Amazon Web Services"
          />
          <DateField
            label="Date"
            value={it.date}
            onChange={(date) =>
              onPatch({ date: date === "present" ? undefined : date })
            }
          />
          <Field
            label="Notes"
            value={it.detail ? plainText(it.detail) : ""}
            onChange={(v) => onPatch({ detail: v ? richText(v) : undefined })}
            multiline
            rows={2}
          />
        </>
      );
    }
  }
}

/** One-line summary used as the collapsed row label. */
export function itemSummary(type: SectionType, item: SectionItem): string {
  switch (type) {
    case "experience": {
      const it = item as ExperienceItem;
      return [it.role, it.organization].filter(Boolean).join(" · ") || "Untitled role";
    }
    case "education": {
      const it = item as EducationItem;
      return (
        [it.degree, it.institution].filter(Boolean).join(" · ") ||
        "Untitled qualification"
      );
    }
    case "skills": {
      const it = item as SkillGroup;
      return it.label || it.items.slice(0, 3).join(", ") || "Untitled group";
    }
    case "projects":
      return (item as ProjectItem).name || "Untitled project";
    case "text": {
      const body = plainText((item as TextItem).body);
      return body.slice(0, 48) || "Empty paragraph";
    }
    default:
      return (item as SimpleItem).title || "Untitled entry";
  }
}
