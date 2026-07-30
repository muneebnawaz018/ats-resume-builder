# SEO Plan

## Constraint that shapes everything

A pure client-side SPA is a weak SEO vehicle. Content pages must have real HTML in the initial response.

**Decided: Next.js App Router with `output: 'export'`.** See `03-architecture.md` for the routing table and the reasoning. In short:

- Content and landing pages prerender to static HTML at build time. No client JS is required to read them.
- The editor is a client-only route, `noindex` — a stateful tool page has nothing to rank on.
- Everything deploys as static files. No server, no runtime cost.

Everything below assumes that setup.

**Metadata comes from the App Router Metadata API**, not from a client-side head library. Each route exports `metadata` (or `generateMetadata` for dynamic routes) covering title, description, canonical, and Open Graph. `app/sitemap.ts` and `app/robots.ts` generate their files at build time, so a new guide cannot be forgotten in the sitemap.

## Keyword strategy

Head terms ("resume builder", "free resume builder", "cv maker") are not winnable. Do not spend on them.

**Tier 1 — tool intent, low competition, high conversion.** These are queries where the searcher wants a tool, not an article, and the incumbents have published articles.

- ats resume checker free
- check if resume is ats friendly
- resume builder no sign up
- free resume builder no credit card
- resume builder that downloads free
- convert resume to ats format
- ats friendly resume template word free
- does my resume pass ats

**Tier 2 — problem/format queries.** Article intent, but each one can host a working widget, which is the differentiator.

- why does ats reject my resume
- resume date format for ats
- should resume be pdf or word for ats
- how many pages should a resume be
- ats resume keywords for [role]
- resume margins and font size ats

**Tier 3 — programmatic, role and region.** Only build these where the page carries a real prefilled document and role-specific rules. A page per role with spun text is worse than not shipping it.

- ats resume for software engineer / data analyst / nurse / accountant …
- resume format pakistan / uae / canada …

## Page inventory

| URL | Type | Purpose |
| --- | --- | --- |
| `/` | static | positioning: free, local, unlocked |
| `/resume-checker` | static shell + client tool | the linter — primary acquisition page |
| `/resume-builder` | client, `noindex` | the editor |
| `/templates` | static index | theme gallery, each with its own page |
| `/templates/[slug]` | static | one per theme; preview image, description, "use this" |
| `/guides/[slug]` | static MDX | Tier 2 content, each embedding a relevant widget |
| `/roles/[slug]` | static | Tier 3, only where real content exists |
| `/methodology` | static | how the score works, honest limitations — also earns links |
| `/privacy` | static | the local-only claim, stated precisely |
| `/terms` | static | plain terms; no ATS-outcome promise |

## Technical checklist

- Real HTML in the initial response for every indexed page. Verify with `curl`, not with devtools.
- One `<h1>` per page, hierarchical headings, descriptive `<title>` under 60 chars, meta description 140–160.
- Canonical URLs, `sitemap.xml`, sane `robots.txt`. `noindex` on `/resume-builder`.
- Structured data: `SoftwareApplication` on `/`, `HowTo` on relevant guides, `FAQPage` where genuine FAQs exist. Do not mark up content that is not visible on the page.
- Core Web Vitals: LCP under 2.5s, CLS under 0.1, INP under 200ms. Static pages should carry almost no JS; the editor bundle must not load on content routes.
- Open Graph and Twitter card images per page.
- Internal linking: every guide links to `/resume-checker`; `/resume-checker` links to `/resume-builder`.
- No interstitials or layout-shifting ad units on content pages.

## Content principles

The category is saturated with generated filler. Competing on volume is a losing move; the incumbents publish more, faster, with staff.

What can actually win:

- **Original data.** Export a resume from each major builder, run the output through open-source ATS-style extractors, publish the results with methodology and reproducible code. That is a linkable asset nobody else has, and it directly demonstrates the product's premise.
- **Working widgets in articles.** An article about date formats that includes a live date-format checker outperforms one that describes the rule.
- **Specificity.** "ATS resume format for Pakistan and Gulf job markets" has real search demand, minimal competition, and cannot be answered well by a US-centric incumbent.

Publishing cadence matters less than each page being the best available answer to one specific query.

## Launch sequence

1. Ship `/resume-checker` and `/resume-builder`. Nothing else matters until the tool is good.
2. Open-source the repository. Makes the privacy claim verifiable.
3. Post to r/resumes, r/EngineeringResumes, r/cscareerquestions, Hacker News, Product Hunt. Lead with "free, no signup, data never leaves your browser" — that framing is the hook, not the feature list.
4. Publish the comparison study. Pitch it to career newsletters and to the subreddits as data rather than promotion.
5. Then, and only then, Tier 2 guides. Roughly one strong page per week beats ten thin ones.
6. Tier 3 programmatic pages last, and only where each page carries genuine role-specific content.

## Measurement

Search Console for queries and impressions. A privacy-respecting analytics tool (Plausible, Umami — self-hostable) for behaviour. **No analytics may ever touch resume content**; instrument events only, never payloads. Breaking that would destroy the one claim the product is built on.

Track: `/resume-checker` completions, check → builder conversion, export completions by format, import success rate. Traffic is a means; exports are the outcome.
