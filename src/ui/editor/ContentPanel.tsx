"use client";

import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { SECTION_HELP, plainText, richText, type Resume } from "@/schema";
import { useAppStore } from "@/store";
import { tone } from "@/ui/tokens";
import { Field } from "./fields";
import { ItemEditor, itemSummary } from "./ItemEditor";
import { useConfirm } from "./useConfirm";

function PanelHeading({
  title,
  help,
}: {
  title: string;
  help?: string;
}) {
  return (
    <Box sx={{ mb: 1.75 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600, mb: help ? 0.5 : 0 }}>
        {title}
      </Typography>
      {help ? (
        <Typography sx={{ fontSize: 12, color: tone.text3, lineHeight: 1.55 }}>
          {help}
        </Typography>
      ) : null}
    </Box>
  );
}

function BasicsEditor({ resume }: { resume: Resume }) {
  const s = useAppStore.getState();
  const b = resume.basics;

  return (
    <Box sx={{ p: 2 }}>
      <PanelHeading
        title="Name and contact"
        help="This block is read first and matters most. If a parser cannot find your name and email here, the rest rarely helps."
      />

      <Field
        label="Full name"
        value={b.fullName}
        onChange={(fullName) => s.updateBasics({ fullName })}
        help="Plain text, no extra spacing or decoration between letters."
      />
      <Field
        label="Job title"
        value={b.headline ?? ""}
        onChange={(headline) => s.updateBasics({ headline })}
        placeholder="Senior Backend Engineer"
        help="Optional. The role you are applying for reads better than the one you currently hold."
      />
      <Field
        label="Email"
        value={b.email ?? ""}
        onChange={(email) => s.updateBasics({ email })}
        placeholder="you@example.com"
      />
      <Field
        label="Phone"
        value={b.phone ?? ""}
        onChange={(phone) => s.updateBasics({ phone })}
        placeholder="+1 415 555 0142"
        help="Include the country code if you are applying abroad."
      />
      <Field
        label="Location"
        value={b.location ?? ""}
        onChange={(location) => s.updateBasics({ location })}
        placeholder="Austin, TX"
        help="City and country. There is no reason to give a street address."
      />

      <Divider sx={{ my: 2 }} />

      <PanelHeading
        title="Links"
        help="Write addresses out in full. Shortened links and clickable-word-only links often extract as nothing at all."
      />
      {b.links.map((l) => (
        <Box key={l.id} sx={{ display: "flex", gap: 1, mb: 1.25 }}>
          <Box sx={{ flex: 1 }}>
            <Field
              label="Label"
              value={l.label}
              onChange={(label) => s.updateLink(l.id, { label })}
            />
          </Box>
          <Box sx={{ flex: 1.6 }}>
            <Field
              label="Address"
              value={l.url}
              onChange={(url) => s.updateLink(l.id, { url })}
            />
          </Box>
          <Tooltip title="Remove link">
            <IconButton
              onClick={() => s.removeLink(l.id)}
              aria-label={`Remove ${l.label || "link"}`}
              sx={{ mt: 0.75 }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
      <Button startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={s.addLink}>
        Add link
      </Button>

      <Divider sx={{ my: 2 }} />

      <PanelHeading
        title="Summary"
        help="Two or three sentences. Concrete beats aspirational — what you have built, at what scale."
      />
      <Field
        label="Summary"
        value={b.summary ? plainText(b.summary) : ""}
        onChange={(v) =>
          s.updateBasics({ summary: v ? richText(v) : undefined })
        }
        multiline
        rows={4}
      />
    </Box>
  );
}

function SectionEditor({
  resume,
  sectionIndex,
  openItemIndex,
}: {
  resume: Resume;
  sectionIndex: number;
  openItemIndex: number | null;
}) {
  const s = useAppStore.getState();
  const { confirm, dialog } = useConfirm();
  const section = resume.sections[sectionIndex];
  const [open, setOpen] = useState<string | false>(
    section?.items[openItemIndex ?? 0]?.id ?? false,
  );

  // Clicking a different entry on the page opens that entry here.
  useEffect(() => {
    if (openItemIndex === null) return;
    const id = section?.items[openItemIndex]?.id;
    if (id) setOpen(id);
  }, [openItemIndex, section]);

  if (!section) return null;

  return (
    <Box sx={{ pb: 3 }}>
      <Box sx={{ p: 2, pb: 1.5 }}>
        <PanelHeading
          title="Section"
          help={SECTION_HELP[section.type]}
        />
        <Field
          label="Heading"
          value={section.title}
          onChange={(title) => s.renameSection(section.id, title)}
          help="Stick to the words parsers know — Experience, Education, Skills. An inventive heading may not be matched to a field."
        />
      </Box>

      <Divider />

      {section.items.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 12.5, color: tone.text3, mb: 1.5 }}>
            Nothing in this section yet.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => s.addItem(section.id)}
          >
            Add the first entry
          </Button>
        </Box>
      ) : (
        <>
          {section.items.map((item, i) => (
            <Accordion
              key={item.id}
              expanded={open === item.id}
              onChange={(_, isOpen) => setOpen(isOpen ? item.id : false)}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography
                  sx={{
                    fontSize: 13,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {itemSummary(section.type, item)}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ItemEditor
                  type={section.type}
                  item={item}
                  onPatch={(patch) => s.updateItem(section.id, item.id, patch)}
                />
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.5,
                    pt: 1,
                    borderTop: `1px solid ${tone.line1}`,
                  }}
                >
                  <Tooltip title="Move up">
                    <span>
                      <IconButton
                        disabled={i === 0}
                        onClick={() => s.moveItem(section.id, i, i - 1)}
                        aria-label="Move entry up"
                      >
                        <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton
                        disabled={i === section.items.length - 1}
                        onClick={() => s.moveItem(section.id, i, i + 1)}
                        aria-label="Move entry down"
                      >
                        <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Duplicate">
                    <IconButton
                      onClick={() => s.duplicateItem(section.id, item.id)}
                      aria-label="Duplicate entry"
                    >
                      <ContentCopyIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Delete this entry">
                    <IconButton
                      onClick={() =>
                        confirm({
                          title: "Delete this entry?",
                          body: `“${itemSummary(section.type, item)}” will be removed from ${section.title}. You can undo this with Ctrl+Z.`,
                          confirmLabel: "Delete entry",
                          onConfirm: () => s.removeItem(section.id, item.id),
                        })
                      }
                      aria-label="Delete entry"
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}

          <Box sx={{ p: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => s.addItem(section.id)}
            >
              Add entry
            </Button>
            <Button
              color="error"
              fullWidth
              sx={{ mt: 1 }}
              onClick={() =>
                confirm({
                  title: `Delete the ${section.title} section?`,
                  body: `This removes ${section.items.length} entr${section.items.length === 1 ? "y" : "ies"} along with it. You can undo this with Ctrl+Z.`,
                  confirmLabel: "Delete section",
                  onConfirm: () => s.removeSection(section.id),
                })
              }
            >
              Delete this section
            </Button>
          </Box>
        </>
      )}
      {dialog}
    </Box>
  );
}

/** Routes to the right editor for whatever is selected in the outline. */
export function ContentPanel({
  resume,
  selectedPath,
}: {
  resume: Resume;
  selectedPath: string | null;
}) {
  if (!selectedPath || selectedPath === "basics") {
    return <BasicsEditor resume={resume} />;
  }

  // Paths look like sections[2].items[0].bullets[3]; both indices matter.
  const match = /^sections\[(\d+)\](?:\.items\[(\d+)\])?/.exec(selectedPath);
  if (match) {
    const index = Number(match[1]);
    const itemIndex = match[2] === undefined ? null : Number(match[2]);
    // Keyed so switching sections resets which entry is expanded rather than
    // carrying the previous section's open row over.
    return (
      <SectionEditor
        key={resume.sections[index]?.id ?? index}
        resume={resume}
        sectionIndex={index}
        openItemIndex={itemIndex}
      />
    );
  }

  return <BasicsEditor resume={resume} />;
}
