# ATS Resume Builder

A free, browser-local resume builder. Exports ATS-safe PDF and DOCX. Every layout token is exposed. No account, no upload, no paywall.

**Status: early development.** The schema, theme system, document renderer, and editor shell are in place. Export (PDF/DOCX), import/parse, and the ATS linter are not built yet.

## Quick start

```bash
npm install
npm run dev     # http://localhost:3000
npm run check   # typecheck + module boundary check
```

## Docs

| Doc | Contents |
| --- | --- |
| [01-product.md](docs/01-product.md) | Positioning, differentiators, v1 scope |
| [02-schema.md](docs/02-schema.md) | Resume and Theme data model |
| [03-architecture.md](docs/03-architecture.md) | System design, tech stack, export/import pipelines |
| [04-ats-rules.md](docs/04-ats-rules.md) | Linter design and full rule catalogue |
| [05-competitive-analysis.md](docs/05-competitive-analysis.md) | Landscape, gaps, risk assessment |
| [06-seo.md](docs/06-seo.md) | Keyword tiers, page inventory, launch sequence |
| [07-roadmap.md](docs/07-roadmap.md) | Phases and deferred work |
| [08-scoring.md](docs/08-scoring.md) | Four-layer scoring model, parse round-trip, extractor design |

## Core decisions

- **Next.js App Router, static export.** No backend, no server runtime, but content routes prerender to real HTML. A plain Vite SPA was rejected: link unfurlers and non-Google crawlers do not execute JS, which would break the community-launch distribution plan outright.
- **Client-only data.** No backend in v1. IndexedDB for storage, JSON files for portability.
- **Content and presentation are separate documents.** `Resume` and `Theme` never mix. Any resume renders under any theme.
- **Theme tokens become CSS custom properties.** Editing a token is a style recalc, not a React re-render.
- **MUI builds the editor; the resume document uses plain CSS.** The DOCX serialiser reads resolved styles and maps them onto OOXML, so those styles must be declared and stable. Emotion's hashed class names and runtime injection would make them opaque. Nothing under `src/render/` imports from `@mui/*`.
- **PDF via the browser print engine.** Real text layer, correct pagination, zero bundle cost. Client-side PDF generation was rejected for v1, font subsetting and manual pagination are a large amount of work for output no better than what the print engine already produces.
- **DOCX is paragraph-based, never table-based.** Right-aligned dates use tab stops. Layout tables are the main reason DOCX exports parse badly, including in most competing products.
- **Import produces a review screen, not a finished document.** Classification accuracy tops out around 80% on conventional resumes and is worse on designed ones. The UX is built around that rather than pretending otherwise.

## Stack

Next.js (App Router, `output: 'export'`) · React 19 · TypeScript · MUI (editor chrome only) · Zustand + immer · Zod · dnd-kit · MDX · `docx` · `mammoth` · `idb` · `pdfjs-dist` (v2)

All MIT/Apache. No paid services in the critical path.
