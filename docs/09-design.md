# Design Direction

## What this product is, visually

A precision instrument for setting a document, which can also X-ray its own output.

It is not a career-services website. The visual language comes from two places the product actually lives in:

- **The print shop**, paper, proofs, margins, leading, page furniture, printer's marks.
- **Machine extraction**, text layers, field maps, monospace, recovered-or-missing.

Every choice below derives from one of those. Anything that could equally decorate a project-management tool has been cut.

## Deliberate non-choices

Named so they do not creep back in:

- No warm cream background with a high-contrast serif and a terracotta accent.
- No hero with a large percentage and a gradient.
- No stock MUI look: Roboto, `#1976d2`, 12px radius, elevation shadows. All overridden.
- No illustration of a person at a laptop. No abstract blobs.
- No numbered `01 / 02 / 03` markers. Nothing here is a sequence.

## The signature: Parse View

One toggle flips the document from what a human sees to what the extractor recovered.

Same page geometry, same position on screen. The rendered resume cross-dissolves into a monospace text layer showing the extraction result: recovered fields tagged and tinted by status, missing fields shown as struck-through gaps where content should have been.

```text
   READING VIEW                    PARSE VIEW
┌────────────────────┐         ┌────────────────────┐
│  Muneeb Ahmed      │         │ ▍name    Muneeb…   │
│  Backend Engineer  │   ⇄     │ ▍title   Backend…  │
│                    │         │ ▍email   ────────  │  ← not recovered
│  EXPERIENCE        │         │ ▍role[0] Senior…   │
│  Senior Engineer   │         │ ▍org[0]  Acme      │
│  Acme · 2021–Now   │         │ ▍end[0]  ────────  │  ← not recovered
└────────────────────┘         └────────────────────┘
```

This is the product's argument made visible. Competitors assert ATS-friendliness; this shows the evidence, on the user's own document, in one keystroke. It is the thing people will screenshot.

It is also the only place the interface is allowed to be dramatic. Everything else stays quiet.

## The device: non-photo blue

In offset printing, non-photo blue is the blue a process camera does not reproduce, used for guide marks that help the person doing the work and never appear in the printed result.

Every editor affordance drawn on top of the document uses it: margin guides, page-break lines, section selection outlines, drop indicators, the baseline grid.

The meaning is literally true here. Those marks exist for the user and never reach the PDF. Stated once in the UI as **"guides never print"**, then never explained again.

This is the one decorative commitment. It earns its place by being accurate.

## Palette

The document is the light source. Chrome recedes so the paper is the brightest object on screen, the same reason Figma, InDesign, and Affinity all put a dark surround around a white artboard. For a tool whose output *is* a printed page, that is not a style preference. It is correct.

```text
--ink-900   #14181D   app background, furthest back
--ink-800   #1C222A   panel surfaces
--ink-700   #262E38   raised surfaces, borders
--ink-600   #38424F   hairlines, dividers
--ink-500   #55606E   disabled, faint text
--ink-300   #98A3B1   secondary text
--ink-100   #E3E8EE   primary text

--paper     #FBFAF7   the document. warm white. the only bright surface
--paper-e   rgba(0,0,0,.55)  document drop shadow

--guide     #79C9EF   non-photo blue, guides, selection, focus
--guide-dim rgba(121,201,239,.22)

--flag      #E8674C   critical    (proofreader's red, softened)
--caution   #E0A458   warning
--pass      #6FBF9A   recovered / passing
```

One accent. The guide blue doubles as the interaction colour, focus rings, selection, primary action. Adding a second accent would dilute the one idea the palette carries.

Severity colours are muted deliberately. Findings are routine, not alarms; a saturated red on every third bullet trains users to ignore it.

Light theme exists for the marketing site and as a builder preference. The builder defaults to dark.

## Typography

**IBM Plex Sans** for the interface, **IBM Plex Mono** for anything measured.

Plex was drawn for an engineering company and carries that in its skeleton. It is neither the neutral default (Roboto, Inter) nor a personality face fighting the content. The mono is a genuine sibling rather than an afterthought, which matters because monospace does real work here: the Parse View, token values, measurements, rule IDs, the status bar.

The division is semantic, not aesthetic: **anything the machine measured is set in mono.** Anything a human wrote is set in sans.

```text
display   Plex Sans 600, -0.02em    26 / 34 / 44
ui        Plex Sans 400/500          13 / 14 / 16
label     Plex Sans 500, 0.06em, uppercase   11
data      Plex Mono 400              11 / 12 / 13
```

Guides and long-form content on the marketing site use **IBM Plex Serif** for body text, editorial register, clearly separate from the application.

The resume document uses none of these. It uses the ATS-safe stack from `04-ats-rules.md`. Two typographic worlds, no bleed between them.

## Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│  resume name          ⌘Z ⌘⇧Z        [ Reading | Parse ]  Export  │
├────────────┬──────────────────────────────────┬─────────────────┤
│            │                                  │  Content        │
│  OUTLINE   │        ┌──────────────┐          │  ─────────      │
│            │        ┊              ┊          │  Design         │
│  ⠿ Basics  │        ┊    PAPER     ┊          │  Checks         │
│  ⠿ Summary │        ┊              ┊          │                 │
│  ⠿ Work    │        ┊  guides in   ┊          │  contextual to  │
│  ⠿ Skills  │        ┊  non-photo   ┊          │  what is        │
│  ⠿ Edu     │        ┊  blue        ┊          │  selected       │
│            │        └──────────────┘          │                 │
│  + section │                                  │                 │
├────────────┴──────────────────────────────────┴─────────────────┤
│ 1 page · 412 words · readiness 92 · saved 12s ago               │
└─────────────────────────────────────────────────────────────────┘
     220px                 fluid, centred                320px
```

**Left, outline.** Sections only. Drag to reorder, click to select, toggle visibility. Not a form. Its job is structure at a glance.

**Centre: the paper.** Always the hero, always centred, zoomable. Nothing floats over it except guides.

**Right, inspector.** Contextual to the selection, three tabs: Content, Design, Checks. Selecting a bullet on the page opens its fields here.

**Bottom, status bar.** Live measurements in mono: pages, words, readiness, save state. Quiet, always present, never demands attention.

### Selection is bidirectional

Click text on the paper, its field focuses in the inspector. Focus a field in the inspector, the corresponding text highlights on the paper.

This is the main departure from how competitors work. They put a form on the left and a dead preview on the right, so the document is an output you watch rather than a thing you touch. Here the document is the primary surface and the form is its inspector.

Full inline editing on a paginated document is a much larger problem, reflow, selection across page breaks, undo semantics. Click-to-focus delivers most of the feeling at a fraction of the risk. Revisit inline editing once pagination is settled.

## Motion

One orchestrated moment: the Parse View transition. 220ms cross-dissolve with a 0.98 scale settle, so it reads as the same document turning over rather than as two screens swapping.

Everything else is 120ms ease-out on hover and focus only. No page transitions, no scroll reveals, no stagger.

`prefers-reduced-motion: reduce` drops the parse transition to an instant swap and removes all easing.

Restraint here is deliberate. In a tool people use for an hour while stressed about a job application, animation is friction wearing a costume.

## MUI configuration

MUI's defaults are the templated look and must be overridden wholesale.

| Default | Override | Why |
| --- | --- | --- |
| Roboto | IBM Plex Sans / Mono | Roboto reads as unstyled Material |
| `#1976d2` primary | `--guide` | one accent, and it means something |
| 4px base radius, 12px on cards | 3px everywhere, 0 on data surfaces | precision instrument, not a friendly app |
| Elevation shadows | hairline borders on `--ink-600` | shadows imply floating; these are panels, not cards |
| Comfortable density | compact | dense inspector, more document visible |
| Uppercase buttons | sentence case | shouting is a Material 2 artifact |
| Ripple | disabled | slow, and it fights a precision feel |

Configured once in `src/ui/theme/muiTheme.ts`. Component-level `sx` overrides of these decisions are a smell, fix the theme instead.

Reminder: MUI never enters `src/render/`. See the styling boundary in `03-architecture.md`.

## Quality floor

Not features, not negotiable:

- Keyboard reachable throughout; visible focus in `--guide`, never `outline: none`
- Contrast at least 4.5:1 for text, 3:1 for interactive boundaries
- `prefers-reduced-motion` respected
- Semantic landmarks; the outline is a real list; the paper is `role="document"`
- Responsive: below 1100px the inspector becomes a bottom sheet, the outline a drawer. Editing on a phone is not a goal, but the document must be readable.
- No layout shift when findings appear or the status bar updates

## Voice

Plain, specific, never salesy. The product's differentiator is honesty, so the copy carries it.

| Not this | This |
| --- | --- |
| "Optimize your resume for ATS!" | "See what the parser recovered." |
| "94% ATS Score 🎉" | "Readiness 92, our heuristic, not a standard." |
| "Oops! Something went wrong." | "Export failed: the document has no sections yet." |
| "Awesome! Saved!" | "Saved." |
| "Submit" | "Export PDF" |

Empty states direct rather than decorate: an empty resume shows "Start with your name and contact details", not an illustration.

Findings name the instance, not the rule: "End date missing on Senior Engineer at Acme", never "Rule `date-format-consistent` violated."
