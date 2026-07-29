"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { plainText } from "@/schema/common";
import { formatDateRange } from "@/lib/date";
import type { ExperienceItem, Resume } from "@/schema/resume";
import { guide, ink, severity } from "../theme/palette";

/**
 * The signature view: the document as an extractor sees it.
 *
 * Phase 0 derives fields directly from the model so the interface exists and
 * can be designed against. From Phase 2 the rows come from a real export
 * round-trip — export, extract, re-parse, diff — as described in
 * docs/08-scoring.md. The row shape is already the shape that produces.
 */
type FieldRow = {
  key: string;
  value: string | null;
};

function fields(resume: Resume): FieldRow[] {
  const rows: FieldRow[] = [
    { key: "name", value: resume.basics.fullName || null },
    { key: "headline", value: resume.basics.headline || null },
    { key: "email", value: resume.basics.email || null },
    { key: "phone", value: resume.basics.phone || null },
    { key: "location", value: resume.basics.location || null },
  ];

  resume.basics.links.forEach((l, i) => {
    rows.push({ key: `link[${i}]`, value: l.url || null });
  });

  if (resume.basics.summary) {
    rows.push({ key: "summary", value: plainText(resume.basics.summary) });
  }

  resume.sections
    .filter((s) => s.visible)
    .forEach((section) => {
      rows.push({ key: `section "${section.title}"`, value: section.type });
      if (section.type !== "experience") return;
      section.items.forEach((raw, i) => {
        const it = raw as ExperienceItem;
        rows.push({ key: `role[${i}]`, value: it.role || null });
        rows.push({ key: `org[${i}]`, value: it.organization || null });
        rows.push({
          key: `dates[${i}]`,
          value: formatDateRange(it.start, it.end) || null,
        });
      });
    });

  return rows;
}

export function ParseView({ resume }: { resume: Resume }) {
  const rows = fields(resume);
  const missing = rows.filter((r) => !r.value).length;

  return (
    <Box
      sx={{
        flex: 1,
        overflow: "auto",
        bgcolor: ink[900],
        p: 4,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 760 }}>
        <Typography
          variant="overline"
          sx={{ color: ink[500], display: "block", mb: 0.5 }}
        >
          Extracted fields
        </Typography>
        <Typography sx={{ fontSize: 12, color: ink[500], mb: 2.5 }}>
          {missing === 0
            ? "Every field was recovered."
            : `${missing} field${missing === 1 ? "" : "s"} could not be recovered. A recruiter would see those blank.`}
        </Typography>

        <Box
          component="dl"
          sx={{
            m: 0,
            fontFamily: "var(--font-plex-mono), monospace",
            fontSize: 12,
            lineHeight: 1.9,
          }}
        >
          {rows.map((r, i) => (
            <Box
              key={i}
              sx={{
                display: "grid",
                gridTemplateColumns: "160px 1fr",
                gap: 2,
                borderLeft: `2px solid ${r.value ? severity.pass : severity.flag}`,
                pl: 1.5,
                mb: 0.25,
                bgcolor: r.value ? "transparent" : "rgba(232,103,76,0.06)",
              }}
            >
              <Box component="dt" sx={{ color: guide, opacity: 0.8 }}>
                {r.key}
              </Box>
              <Box
                component="dd"
                sx={{
                  m: 0,
                  color: r.value ? ink[100] : severity.flag,
                  overflowWrap: "anywhere",
                }}
              >
                {r.value ?? "─────────  not recovered"}
              </Box>
            </Box>
          ))}
        </Box>

        <Typography sx={{ fontSize: 11, color: ink[600], mt: 3 }}>
          Phase 0 reads these from the document model. From Phase 2 they come
          from a real export round-trip.
        </Typography>
      </Box>
    </Box>
  );
}
