# Roadmap

Phases, not dates. Each phase ends in something shippable.

## Phase 0 — Foundation

- Next.js App Router + TS strict, `output: 'export'`, path aliases
- Route skeleton: static `/` and `/check` shells, client-only `/builder` with `noindex`
- MUI set up on `/builder` with its Emotion cache provider; ESLint `no-restricted-imports` blocking `@mui/*` inside `src/render/`
- Zod schemas for `Resume` and `Theme`, plus the migration harness
- Zustand slices with immer, patch-based undo/redo
- IndexedDB persistence with debounced autosave
- Token → CSS custom property resolution

Exit: a hardcoded resume object renders at `/builder`, editing a token in the store visibly changes the preview, and `curl` on `/` returns real HTML content.

Settling the route split now, rather than retrofitting it in Phase 5, is the point of doing this first. Extracting an editor from a finished SPA into a framework later is the expensive version of this work.

## Phase 1 — Editor and preview

- Section renderers for all built-in types
- Content editing forms per section type
- Constrained rich text (bold, italic, link only)
- Add/remove/reorder/hide sections and items via dnd-kit
- Custom section type with user-defined fields
- Paged preview with zoom
- Design panel exposing every token, with per-section overrides
- 4–6 built-in themes, fork-on-edit

Exit: a resume can be built from scratch entirely in the UI.

## Phase 2 — Export

- Print stylesheet, `@page`, break control, pre-print settings modal
- DOCX serialiser: styles part, numbering part, tab-stop-based date alignment, package assembly
- Plain text export
- Resume JSON and theme JSON export/import
- Validation loop: Word, Google Docs, LibreOffice, plus a naive text extractor

Exit: PDF and DOCX both export and both survive text extraction with correct reading order.

This is the phase most likely to overrun. DOCX failures are opaque; budget accordingly.

## Phase 3 — ATS linter

- Rule engine and `Finding` plumbing
- All rules from the catalogue
- Findings panel with click-to-focus and autofixes
- Safe Mode with per-control explanations
- Score with honest framing plus the methodology page
- Job description paste and keyword coverage checklist

Exit: `/check` is usable as a standalone product.

## Phase 4 — Import

- `Block[]` intermediate and the shared classifier
- DOCX import via mammoth
- Post-import review screen showing detected structure and dropped content
- Labelled corpus of ~20 resumes with accuracy tracked as a regression metric

Exit: a conventional DOCX resume imports into an editable document with most structure intact.

## Phase 5 — Site and launch

Routes exist from Phase 0; this phase fills them.

- Content for home, templates, guides, methodology, privacy
- Per-route Metadata API entries; `app/sitemap.ts` and `app/robots.ts`
- Structured data, OG images, Core Web Vitals pass
- Per-route JS budget check in CI
- Open-source the repository
- Launch posts

Exit: publicly launched, and `curl` on every indexed route returns its content in the initial HTML.

## Phase 6 — Depth

- Version snapshots and diff view
- Per-job tailoring workflow
- Theme sharing via URL-encoded JSON
- PDF import via pdfjs-dist plus coordinate heuristics
- Additional export targets (Markdown, JSON Resume)

## Deferred, with rationale

| Item | Why deferred |
| --- | --- |
| Accounts and cloud sync | Requires a backend and contradicts the local-only claim. Only if users ask. |
| AI content generation | Costs money per call, and the category is saturated with it. Not a differentiator. |
| AI import cleanup | Would genuinely help import accuracy. Revisit once heuristic accuracy is measured and known to be insufficient. |
| Cover letters | Different document, different rules. Separate product. |
| Mobile editing | The interaction model does not fit a phone. View and export only. |
| Ads | Only after traffic exists, and never on the editor. |

## Where the time actually goes

Ranked by risk of overrun:

1. DOCX correctness — opaque failures, slow iteration
2. Import classification — accuracy ceiling is inherent, not a bug to fix
3. Pagination fidelity between preview and print
4. Rule catalogue breadth — each rule is small, but there are forty of them
5. Content and SEO — ongoing, not a phase that ends

Everything else is routine.
