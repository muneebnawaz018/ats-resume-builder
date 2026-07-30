# ATS Scoring Model

## Position on accuracy

No ATS vendor publishes its parser or its ranking algorithm. Workday, Taleo, iCIMS, Greenhouse, Lever, SuccessFactors and Ashby each behave differently, and their behaviour changes without notice. Any product claiming a verified "ATS score" is claiming something it cannot know.

So the product does not claim to reproduce a vendor score. It claims something narrower and actually true:

> We extract your resume the way a parser does, attempt to rebuild the structured fields a recruiter sees, and show you exactly what survived.

That is measurable, reproducible, and demonstrably useful. It is also a stronger claim than the competition makes, because it can be verified by the user on their own file.

## Four scoring layers

The score is composed from four sources, in increasing order of value.

### Layer 1. Rule compliance (static)

The rule catalogue in `04-ats-rules.md`, run over the document. Cheap, instant, runs on every keystroke.

Weakness: it checks the document model, not the output. A rule can pass while the exported file still parses badly.

### Layer 2. Parse round-trip (the differentiator)

Export the document, read it back, and measure what was recoverable.

```text
Resume (truth) ──export──> PDF/DOCX ──extract──> text
                                          │
                                    ┌─────▼──────┐
                                    │ own parser │
                                    └─────┬──────┘
                                          ▼
                                  Resume' (recovered)
                                          │
                          diff(truth, Resume') = fidelity
```

Field recovery is scored per field, not per document:

```ts
type FieldCheck = {
  path: string            // "sections[0].items[1].end"
  expected: string
  recovered: string | null
  status: 'exact' | 'fuzzy' | 'missing' | 'wrong'
}
```

- `exact`, normalised strings match
- `fuzzy`, match after case/whitespace/punctuation normalisation, or Levenshtein above threshold
- `missing`, not found anywhere in extracted text
- `wrong`, found, but attached to the wrong parent (a date landing under the wrong role, the classic multi-column failure)

Fidelity = weighted recovery across name, contact, each role's title/org/dates, each degree, and skills. `wrong` scores lower than `missing`, because misattributed data is more damaging to a recruiter's screen than absent data.

This runs on demand rather than on keystroke, because it costs an export.

**Reading order** is the highest-signal single check here. Extract text, compare its sequence against the document's logical order. A mismatch is the root cause of most real ATS failures and is invisible to rule-based checking.

### Layer 3. Content quality (heuristic)

Not parser behaviour, recruiter behaviour. Action verbs, quantified achievements, bullet length distribution, tense consistency, filler-phrase detection, acronym expansion, section completeness.

Scored separately and labelled as such. Conflating "will a machine read this" with "is this well written" is the mistake that makes competitor scores meaningless.

### Layer 4. Job match (optional, only with a pasted posting)

Term extraction from the posting, matched against the resume. Reported as a coverage checklist with present/missing terms.

Never folded into the main score: a resume is not worse for not matching a posting the user has not chosen. Shown as a separate, clearly-labelled panel.

## Composite presentation

Four numbers, not one:

```text
Parse Fidelity      92%   ← measured, layer 2
Format Compliance   85%   ← rules, layer 1
Content Strength    71%   ← heuristic, layer 3
Job Match           64%   ← optional, layer 4
```

Each expands to its findings. Parse Fidelity leads because it is the only measured one.

If a single headline number is required for the UI, it is Parse Fidelity + Format Compliance weighted 60/40, labelled "ATS Readiness" with the methodology one click away. Content Strength is never folded in. It is subjective, and mixing it in is what makes competitor scores untrustworthy.

## Building the extractor

The recovery parser is the core asset. Pipeline:

### 1. Text extraction

- PDF: `pdfjs-dist` `getTextContent()` → items with `str`, `transform` (position), `width`, `height`, `fontName`
- DOCX: `mammoth` → semantic HTML, or read `word/document.xml` directly for paragraph and style fidelity

### 2. Line reconstruction (PDF only)

Group text items into lines by y-coordinate within a tolerance. Sort lines by y, then x. Detect column structure: cluster x-positions of line starts; two well-separated clusters spanning the page height mean a two-column layout, which is itself a critical finding.

### 3. Block classification

Shared with the import pipeline, same `Block[]` intermediate, same classifier. Building it once serves both features.

Signals: relative font size, weight, all-caps, line length, vertical gap before, x-indent, presence of a date pattern, bullet glyph at line start.

### 4. Section segmentation

Match candidate headings against a synonym dictionary (~200 entries: EXPERIENCE / WORK HISTORY / EMPLOYMENT / PROFESSIONAL EXPERIENCE / CAREER SUMMARY …). Partition the block stream at matches.

### 5. Field extraction

Per section type. Dates by regex over a set of accepted formats; role and organisation by position and weight within the item's first lines; bullets by glyph or hanging indent.

### 6. Diff

Compare recovered structure against the source `Resume`. Emit `FieldCheck[]`.

This extractor is the same code path as DOCX/PDF import. One investment, two features (scoring and import), which is a strong argument for building it early rather than in Phase 4.

## Validating the extractor itself

The scoring is only credible if the extractor is roughly as capable as a real ATS. Calibrate against open implementations:

- **Apache Tika**, the text extraction layer used inside a great many enterprise systems. If Tika's output for a file is garbled, real systems are seeing garbage too. Runnable in CI via a container.
- **PyResparser / pyresparser-style open extractors**, **Affinda's open datasets**, and the **resume parsing corpora on Kaggle** for labelled ground truth.
- **`docx2txt` and `pdftotext` (poppler)** as naive baselines. Anything that fails these fails everywhere.

CI job: for each fixture resume, export → run through Tika and poppler → assert reading order and field recovery. That produces a regression number and, published, becomes the linkable original research described in the SEO plan.

## Score honesty rules

Non-negotiable, and they are a feature rather than a limitation:

1. Never claim compatibility with a named vendor without having tested against that vendor.
2. Never show a score without its findings.
3. Never award 100. Cap the display at 98 with "no parser is guaranteed", because it is true.
4. Publish the methodology page and link it from every score.
5. Never let the score depend on using a paid feature.

The competition inflates scores because the score is a sales device. An accurate, sometimes-unflattering score is the more useful product, and it is the thing users will describe to other people.

## Implementation order

1. Rule engine, Layer 1, fast, unlocks `/resume-checker`
2. Text extraction and line reconstruction, shared with import
3. Block classifier and section segmentation, shared with import
4. Field extraction and diff, Layer 2, the differentiator
5. Content heuristics, Layer 3
6. Job match, Layer 4
7. Tika/poppler calibration in CI

Steps 2–4 are the expensive part and the part worth building.
