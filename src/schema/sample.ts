import { richText } from "./common";
import { DEFAULT_THEME_ID } from "./builtinThemes";
import { RESUME_SCHEMA_VERSION, type Resume } from "./resume";

/** Starting document for a new resume. Also the dev fixture. */
export function createSampleResume(id: string, now: string): Resume {
  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    id,
    name: "Untitled resume",
    createdAt: now,
    updatedAt: now,
    themeId: DEFAULT_THEME_ID,
    basics: {
      fullName: "Alex Mercer",
      headline: "Senior Backend Engineer",
      email: "alex.mercer@example.com",
      phone: "+1 415 555 0142",
      location: "Austin, TX",
      links: [
        {
          id: "l1",
          label: "LinkedIn",
          url: "linkedin.com/in/alexmercer",
          displayAs: "url",
        },
        {
          id: "l2",
          label: "GitHub",
          url: "github.com/alexmercer",
          displayAs: "url",
        },
      ],
      summary: richText(
        "Backend engineer with eight years building payment and identity systems at scale. Led the migration of a monolithic billing service to event-driven infrastructure handling 40M transactions per month.",
      ),
    },
    sections: [
      {
        id: "s_exp",
        type: "experience",
        title: "Experience",
        visible: true,
        items: [
          {
            id: "e1",
            visible: true,
            role: "Senior Backend Engineer",
            organization: "Northwind Payments",
            location: "Austin, TX",
            start: { year: 2021, month: 3 },
            end: "present",
            bullets: [
              richText(
                "Rebuilt the settlement pipeline as an event-driven service, cutting end-to-end reconciliation time from 6 hours to 11 minutes.",
              ),
              richText(
                "Designed an idempotency layer that eliminated duplicate charges, reducing payment support tickets by 73%.",
              ),
              richText(
                "Mentored four engineers; two were promoted to senior within 18 months.",
              ),
            ],
            tech: ["Go", "PostgreSQL", "Kafka", "AWS"],
          },
          {
            id: "e2",
            visible: true,
            role: "Backend Engineer",
            organization: "Fieldmark",
            location: "Remote",
            start: { year: 2018, month: 6 },
            end: { year: 2021, month: 2 },
            bullets: [
              richText(
                "Built a multi-tenant permissions service adopted by all 12 product teams.",
              ),
              richText(
                "Reduced p99 API latency from 840ms to 120ms by introducing read replicas and query batching.",
              ),
            ],
            tech: ["Python", "Django", "Redis"],
          },
        ],
      },
      {
        id: "s_edu",
        type: "education",
        title: "Education",
        visible: true,
        items: [
          {
            id: "d1",
            visible: true,
            degree: "BSc Computer Science",
            institution: "University of Texas at Austin",
            location: "Austin, TX",
            start: { year: 2014, month: 9 },
            end: { year: 2018, month: 5 },
            detail: [],
          },
        ],
      },
      {
        id: "s_skills",
        type: "skills",
        title: "Skills",
        visible: true,
        items: [
          {
            id: "k1",
            visible: true,
            label: "Languages",
            items: ["Go", "Python", "TypeScript", "SQL"],
          },
          {
            id: "k2",
            visible: true,
            label: "Infrastructure",
            items: ["AWS", "Kubernetes", "Kafka", "Terraform"],
          },
        ],
      },
    ],
    meta: { jurisdiction: "generic" },
  };
}
