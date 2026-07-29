# Product Definition

## One-liner

A free, browser-local resume builder that exports genuinely ATS-safe PDF and DOCX, with every layout token exposed to the user.

## Positioning

Existing builders (Zety, Resume.io, Novoresume, Kickresume, Enhancv, Rezi, Teal, FlowCV) are subscription funnels. Their constraints:

- Download is paywalled — the near-universal complaint.
- Templates are locked presets. Deep customization is withheld to protect a house style.
- Data lives on their servers because the email address is the product.
- DOCX exports frequently use tables for layout, which ATS parsers mangle.

None of those are technical limits. They are business-model limits. A free, local, unlocked tool cannot be matched by an incumbent without cannibalising their revenue. That asymmetry is the entire strategic basis of this product.

## Target user

Primary: job seekers who already have a resume and want it to survive automated screening. They are not looking for design help; they are looking for the thing not to break.

Secondary: people who want fine control over typography and spacing and are frustrated by locked templates.

Explicitly not targeting: users who want visually elaborate, graphic-heavy CVs. Those are ATS-hostile by nature and the product should say so.

## Differentiators, ranked

1. **Free unlimited export, no signup.** No account wall, no watermark, no credit system.
2. **100% local.** Resume data never leaves the browser. No upload, no server storage. This is verifiable by the user in devtools and is worth saying loudly.
3. **Token-level customization.** Every font size, weight, gap, margin, rule, and alignment is exposed and live-editable. Themes are plain JSON that users can export and share.
4. **ATS linter with per-rule explanations.** Not a vanity score. Each finding names the rule, the location, and the fix.
5. **ATS Safe Mode.** A toggle that disables the choices known to break parsers and explains why each is disabled. Freedom and safety, user's call.
6. **True DOCX.** Paragraph-and-style based OOXML, no layout tables. Opens clean in Word and Google Docs and parses correctly.
7. **Data portability.** Full resume JSON export/import. No lock-in, stated as a feature.
8. **Versions and job tailoring.** Duplicate a resume, tailor it to a posting, diff two versions.

## Non-goals for v1

- Accounts, cloud sync, sharing links
- Cover letter builder
- AI content generation
- PDF import (v2)
- Mobile editing (view/export on mobile is fine; editing is desktop-first)

## Success criteria for v1

- A user can build a resume from scratch and export a PDF in under 10 minutes without an account.
- Exported DOCX opens in Word with no repair prompt and no layout tables.
- Exported PDF, when text is extracted with a naive parser, yields correctly ordered, readable content.
- Theme JSON round-trips: export, import, identical render.
