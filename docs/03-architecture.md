# Architecture

## Shape

No backend. Static bundle on a CDN. All state in the browser.

**Next.js App Router with `output: 'export'`.** Content routes are prerendered to real HTML at build time; the editor is a client-only route. Both ship from the same static deployment.

A plain Vite SPA was rejected. Its initial response is an empty `<div id="root">`, which fails in the exact places this product's distribution plan depends on:

- Social and link unfurlers (Reddit, LinkedIn, X, Slack, Discord) never execute JS. Launch posts would render blank cards.
- Non-Google crawlers — Bing, DuckDuckGo, and AI crawlers (GPTBot, PerplexityBot, ClaudeBot) — render JS poorly or not at all.
- Googlebot does render, but in a deferred second pass, so indexing is slow and partial.
- LCP suffers: blank → download → parse → paint.

Static export keeps every advantage of the SPA (free static hosting, no server, no runtime cost) while putting real HTML in the initial response.

### Route modes

| Route | Mode | Indexed |
| --- | --- | --- |
| `/` | static | yes |
| `/resume-checker` | static shell, client tool | yes |
| `/templates`, `/templates/[slug]` | static, generated from theme JSON | yes |
| `/guides/[slug]` | static MDX | yes |
| `/roles/[slug]` | static | yes |
| `/methodology` | static | yes |
| `/terms`, `/privacy` | static | yes |
| `/resume-builder` | client-only | no (`noindex`) |

The editor is an ordinary client component tree. Zustand, dnd-kit, `docx`, `mammoth` and `pdfjs-dist` are loaded through `next/dynamic` with `ssr: false` so they are excluded from the server build and from every content route's bundle.

`output: 'export'` disables API routes, ISR, and server actions. None are needed — the product is local-only by design. If accounts are ever added, dropping static export and deploying to a runtime is a config change, not a rewrite.

```text
┌─────────────────────────────────────────────────────┐
│ UI shell                                            │
│  ┌───────────┬──────────────────┬────────────────┐  │
│  │ Content   │  Live preview    │  Design /      │  │
│  │ editor    │  (paged HTML)    │  ATS panel     │  │
│  └───────────┴──────────────────┴────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼─────────┐
              │  Store (Zustand) │  Resume + Theme + UI + history
              └────────┬─────────┘
                       │
     ┌─────────────────┼──────────────────┬─────────────┐
     │                 │                  │             │
┌────▼─────┐   ┌───────▼──────┐   ┌───────▼─────┐ ┌─────▼──────┐
│ Renderer │   │ ATS linter   │   │ Exporters   │ │ Importers  │
│ (HTML)   │   │ (pure rules) │   │ PDF / DOCX  │ │ DOCX / JSON│
└──────────┘   └──────────────┘   └─────────────┘ └────────────┘
                       │
              ┌────────▼─────────┐
              │ Persistence      │  IndexedDB (idb) + JSON file I/O
              └──────────────────┘
```

## Core principle: one document, four consumers

`Resume + Theme` is the single source of truth. Four independent pure functions consume it:

| Consumer | Output | Notes |
| --- | --- | --- |
| HTML renderer | React tree + CSS vars | drives preview and print |
| Print pipeline | PDF | same DOM, print stylesheet |
| DOCX serialiser | `.docx` | maps schema → OOXML paragraphs |
| ATS linter | `Finding[]` | reads schema and resolved tokens, never the DOM |

No consumer talks to another. Adding a fifth (plain text export, JSON Resume export, Markdown) is additive.

## Rendering and pagination

The preview is a stack of fixed-size page elements. Content flows through a measurement pass that decides page breaks.

Two viable approaches; recommendation follows.

**A. CSS-native flow (recommended).** One continuous content column with `break-inside: avoid` on items, rendered inside a container sized to the page width. Page boundaries are drawn as absolutely-positioned overlay guides computed from `scrollHeight / pageHeight`. Printing hands everything to the browser's own paginator.

- Pro: the browser paginates, which is the hard part, and print output matches exactly because it *is* the same engine.
- Con: page-boundary overlay is approximate; a widow can appear in preview slightly off from print.

**B. Manual measurement.** Measure each item with `getBoundingClientRect`, pack into page buckets in JS, render discrete page elements.

- Pro: pixel-exact preview, per-page control, page numbers trivially correct.
- Con: you have reimplemented pagination. Every font load, every token change invalidates measurements. This is where these projects die.

Start with A. Move to B only if users complain that preview and print diverge.

Either way: **never render the preview in an iframe with a separate stylesheet**. Two style contexts drift.

## Theme application

Tokens are written to CSS custom properties on the preview root in one effect:

```ts
useEffect(() => {
  const el = previewRef.current
  for (const [k, v] of Object.entries(resolveTokens(theme))) {
    el.style.setProperty(`--${kebab(k)}`, formatToken(v))
  }
}, [theme])
```

Consequence: dragging a spacing slider triggers no React reconciliation of resume content, only a style recalc. Sixty-frames-per-second theme editing on a long resume is achievable this way and is not achievable if tokens are passed as props.

Section overrides declare the same variables on the section element.

## State management

Zustand + immer. Chosen over Redux for the boilerplate and over Context for the re-render behaviour. Slices:

- `resumeSlice` — CRUD on resume/sections/items
- `themeSlice` — token edits, presets, fork-on-edit for built-ins
- `uiSlice` — selection, zoom, panels, safe mode
- `historySlice` — patch-based undo/redo, subscribed to the two document slices

Selectors are granular so an edit to one bullet does not re-render the whole document.

## Persistence

IndexedDB via `idb`, not localStorage. Reasons: localStorage is synchronous (jank on autosave), has a ~5MB cap, and stores strings only. Resume documents are small, but versions plus themes plus autosave history add up.

- Autosave debounced 500ms.
- Object stores: `resumes`, `themes`, `snapshots`.
- Snapshots on every export and on manual "save version" — enables the version diff feature.
- JSON file export/import as the portability escape hatch.

No data ever leaves the browser. Analytics, if added, must be aggregate and must never include resume content.

## Directory layout

```text
app/                       Next.js App Router
  layout.tsx
  page.tsx                 /
  check/page.tsx           /resume-checker       static shell + client tool
  builder/page.tsx         /resume-builder     'use client', noindex
  templates/[slug]/        generated from theme JSON
  guides/[slug]/           MDX
  roles/[slug]/
  methodology/page.tsx
  privacy/page.tsx
  sitemap.ts               generated
  robots.ts
content/
  guides/*.mdx             prose, versioned with the code
src/
  store/                zustand slices
  schema/               zod schemas, types, migrations
  render/
    ResumeDocument.tsx  root renderer
    sections/           one component per SectionType
    tokens.ts           token → CSS var resolution
    print.css           @media print + @page
  export/
    pdf.ts              print pipeline
    docx/               OOXML serialiser
      document.ts       schema → w:p / w:r
      styles.ts         w:styles part
      numbering.ts      bullet definitions
      package.ts        zip assembly
    txt.ts              plain text export
    json.ts             portability export
  import/
    docx.ts             mammoth → HTML → schema
    json.ts
    heuristics.ts       block classification shared by importers
  ats/
    rules/              one file per rule
    engine.ts           runs rules, returns Finding[]
    keywords.ts         job-description matcher
  ui/
    tokens/             design tokens; imports nothing, safe on any route
    theme/              MUI theme + provider (pulls the MUI runtime)
    site/               header, menu, motion for the content routes
    editor/             content forms, dnd
    design/             token controls
    ats/                findings panel
  lib/                  ids, dates, files, site metadata
```

Every folder exposes an `index.ts` barrel, and imports use the `@/` alias
rather than relative hops — `@/schema` rather than `../../schema`. Siblings
inside a folder still import each other directly (`./TopBar`), because routing
those through the folder's own barrel is a cycle.

Barrels export what other folders consume, not everything a folder contains.
`ui/editor` exports `EditorShell` alone — an earlier version re-exported all
thirteen parts, which meant reaching for one component would have pulled the
whole editor and the MUI runtime with it.

`ui/tokens` is separate from `ui/theme` on purpose. The MUI theme reads the
tokens, so a single barrel exporting both meant that importing one colour on a
static page pulled in Emotion — 33KB on every content route. `check-boundaries`
now fails the build if a content route imports MUI, editor chrome, or
`@/ui/theme`, and if anything in `ui/tokens` grows an import.

## Checks

| Command | Catches |
| --- | --- |
| `npm run typecheck` | type errors |
| `npm run check:boundaries` | the styling and route boundaries above |
| `npm run knip` | unused files, exports, types and dependencies |
| `npm run check` | all three — run this before a commit |
| `npm run analyze` | writes `.sonda/sonda.html`, a treemap of what each route ships |

`knip` is configured to treat unused exports as errors rather than warnings.
A barrel makes it cheap to export something nobody imports, and that surface
accumulates silently; this makes it fail instead.

`analyze` builds with webpack (`--webpack`), because Sonda instruments the
bundler and the default build uses Turbopack. It is a diagnostic build only —
what ships is the normal Turbopack one.

## Tech stack

| Concern | Choice | Rationale |
| --- | --- | --- |
| Framework | Next.js App Router, `output: 'export'` | prerendered HTML on content routes; still deploys as static files |
| Language | TypeScript, strict | schema-heavy app, types earn their keep |
| UI | React 19 | ecosystem for dnd, forms |
| Content | MDX via `@next/mdx` | guides live in the repo, versioned with the code |
| Editor UI | MUI (Material UI) + Emotion | the editor is form-heavy; replaces Tailwind, an icon set, and four or five headless control libraries |
| Document styling | plain CSS + custom properties, no MUI | export depends on styles being readable and predictable — see below |
| State | Zustand + immer | small, granular, patch-friendly |
| Validation | Zod | schema is the product; runtime validation on load |
| Drag/drop | dnd-kit | accessible, no legacy HTML5 DnD quirks |
| DOCX out | `docx` npm | avoids hand-writing OOXML and zip |
| DOCX in | `mammoth` | DOCX → semantic HTML |
| PDF in (v2) | `pdfjs-dist` | text + coordinates |
| PDF out | browser print | see below |
| Storage | `idb` | thin IndexedDB wrapper |
| Icons | `@mui/icons-material` | app chrome only, never in the document |
| Hosting | Cloudflare Pages or Vercel | static, free tier, good CDN |

All MIT/Apache. No paid services anywhere in the critical path.

## The styling boundary

The application has two visual surfaces with opposite requirements, and they must not share a styling system.

**Editor chrome** — panels, forms, sliders, dialogs, menus. Built with MUI.

**The resume document** — the thing that becomes a PDF or a DOCX. Plain CSS driven by custom properties. No MUI, no Emotion, no `sx`.

The reason is the export pipeline. The DOCX serialiser reads the document's resolved styles and maps them onto OOXML:

```text
font-size: 11pt   →   <w:sz w:val="22"/>
font-weight: 700  →   <w:b/>
margin-bottom: 6pt →  <w:spacing w:after="120"/>
```

That mapping requires styles to be declared, readable, and stable. Emotion generates hashed class names (`css-1q2w3e4r`) and injects rules at runtime, which makes the resolved style set opaque to the serialiser and unstable across builds. The same applies to the print stylesheet, which must be able to target document elements deterministically.

The token system reinforces this. Every theme token becomes a CSS custom property on the document root, which is what makes theme editing a style recalculation rather than a re-render. Routing that through a CSS-in-JS runtime would discard the property, and with it the performance characteristic.

Practical rule: **nothing under `src/render/` imports from `@mui/*`.** Worth enforcing with an ESLint `no-restricted-imports` rule on that directory, since the boundary is easy to cross by accident and the failure appears later, in export, rather than at the point of the mistake.

### MUI and route budgets

MUI components are client components, so any route importing them ships the runtime. Next code-splits per route, so `/resume-builder` carrying MUI costs the content routes nothing — provided no shared module static-imports from `@mui/*`. That is the specific regression the per-route bundle check in CI exists to catch.

Content routes use plain CSS modules. They are mostly text and need no component library.

MUI's Emotion runtime requires a cache provider configured for the App Router. Acceptable given MUI loads on one route. MUI's zero-runtime alternative (Pigment CSS) would avoid the setup but is not mature enough to build on yet; revisit later, since the boundary above means switching would touch only editor chrome.

## PDF export decision

Two options were considered.

**Browser print (`window.print()`) — chosen.** A print stylesheet plus `@page` rules. The browser produces a real text-layer PDF with correct font shaping, unicode, and pagination.

- ATS-safe by construction: the text layer is genuine, selectable, and in reading order.
- Zero bundle cost.
- Cost: the user goes through the OS print dialog, cannot be given a filename automatically, and Safari's margin handling differs from Chrome's. Some users will produce a PDF with browser headers/footers unless instructed. Mitigate with a pre-print modal showing the exact settings to use.

**`pdf-lib` / client-side generation — rejected for v1.** Full control over filename and bytes, but requires embedding and subsetting fonts, computing text metrics for wrapping, and implementing pagination manually. That is a large amount of work to arrive at output that is, at best, equal to what the print engine already produces.

Revisit if the print dialog proves to be a real conversion problem. The renderer is separate from the exporter, so swapping is contained.

## DOCX export: the actual risk

This is the part most likely to consume unplanned time. Word is strict and fails opaquely — a malformed part produces "Word found unreadable content" with no indication of which part.

Rules:

- **No layout tables.** Tables are the standard trick for right-aligned dates and the standard reason ATS output turns to noise. Use right tab stops instead: a paragraph with a right-aligned tab stop at the content width, `role\tdate`.
- Bullets via a real `numbering.xml` definition, not a literal `•` character in the text.
- Define named styles in `styles.xml`; do not inline formatting on every run.
- Nothing in headers or footers except optional page numbers. Contact details in headers are invisible to many parsers.
- No text boxes, no images, no columns, no SmartArt.

Validation loop: export → open in Word, Google Docs, LibreOffice → extract text with a naive parser and confirm reading order. Automate the last step as a test fixture.

## Import pipeline

Shared design: every importer produces a `Block[]` intermediate, then a single classifier maps blocks to schema.

```ts
type Block = {
  text: string
  bold: boolean; italic: boolean
  fontSize: number
  isAllCaps: boolean
  isBullet: boolean
  gapBefore: number
  x?: number          // PDF only
}
```

Classifier heuristics, in order: detect section headings (all-caps or larger or bold, short, matched against a synonym dictionary of ~200 known heading names), then partition blocks under headings, then within each partition detect item boundaries (date pattern present, or bold run at line start), then assign bullets.

Expect roughly 80% accuracy on conventional single-column resumes and considerably worse on two-column or heavily designed ones. Design the UX around that: import lands the user in a review screen showing what was detected and what was dropped, not straight into a finished document. Under-promise in the copy — "import as a starting point".

DOCX first, since `mammoth` preserves structure. PDF import in v2.

## Performance targets

- Keystroke to preview update: under 16ms. Achieved by rendering from the store with granular selectors and keeping tokens out of props.
- Token slider drag: no content re-render at all (CSS vars only).
- Cold load to interactive: under 1.5s on 4G. Code-split the DOCX exporter, the importers, and `pdfjs-dist` — none are needed on first paint.
- **Content routes: framework floor + under 10KB.** Measured on the current build, the Next 16 App Router baseline is ~182KB gzipped and a content route adds ~2KB on top. The absolute figure is fixed by the framework; the number worth defending is the delta, because that is what regresses.
- **Editor: floor + under 200KB.** Currently ~181KB for MUI, Emotion, and the store.
- The editor bundle must never be reachable from `/`, `/resume-checker`, or a guide page. Enforce per-route in CI: an accidental static import from a shared module is the usual way this breaks, and it fails silently.

An earlier draft of this document set a sub-30KB absolute target for content routes. That is not achievable on the App Router — it is an Astro-class number, and reaching it would mean giving up the single-framework benefit that motivated choosing Next. If content-route weight ever becomes the binding constraint, moving the content site to Astro is the lever, not shaving the Next baseline.

For SEO the relevant fact is that content is in the initial HTML and the page paints without executing any of it. Verified: `curl` on `/` and `/resume-checker` returns the copy, and no external resource is requested (fonts are self-hosted by `next/font`).

## Testing

- Schema migrations: fixture per version, assert round-trip.
- ATS rules: table-driven, one fixture per rule, positive and negative case.
- DOCX export: golden-file test on the generated XML, plus a text-extraction assertion for reading order.
- Import: corpus of ~20 real resumes with hand-labelled expected output; track classification accuracy as a number that must not regress.
- Print: manual, per browser. Not automatable in any useful way.
