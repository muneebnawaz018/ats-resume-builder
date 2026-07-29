# ATS Rules Engine

## What ATS actually is

Applicant Tracking Systems (Workday, Taleo, Greenhouse, Lever, iCIMS, SuccessFactors, Ashby) ingest a file, extract text, and attempt to map that text into structured fields: name, contact, employment history with dates, education, skills. Modern systems are better than folklore suggests, but the failure modes are real and consistent.

Three things to be honest about in the product copy, because the category is full of marketing nonsense:

- There is no universal "ATS score". Any number shown is this tool's own heuristic. Say so.
- Most systems do not auto-reject on formatting. They mis-parse, and a recruiter then sees garbled or empty fields. The damage is real but indirect.
- Much of the popular advice is a decade out of date. Rules asserted without evidence are how this product would become the thing it is trying to replace.

## Two rule contexts

A distinction the rule set depends on, and the most common design error in tools like this.

**Native documents** are built in this editor. The renderer physically cannot emit a table, a text box, a multi-column layout, or a page header. Structural rules about those things can never fire on a native document. Listing them as passing "critical" checks inflates the score for free and teaches the user nothing.

**Foreign documents** arrive through import or through `/resume-checker`. Every structural rule applies, because the source file can contain anything.

```ts
type RuleScope = 'native' | 'foreign' | 'both'
```

Rules declare their scope. Score denominators only count rules that were actually applicable, so a native document is never credited for avoiding something it could not have done. On a native document the structural category is displayed as "guaranteed by the editor" rather than as a passed check — accurate, and a better sales argument than a fake tick.

## Evidence tiers

Every rule carries the basis for its claim. This is enforced at the type level so a rule cannot be added without one.

```ts
type Evidence =
  | { tier: 'measured'; note: string }   // we test it: round-trip through our own extractor, Tika, poppler
  | { tier: 'documented'; url: string }  // vendor or standards documentation states it
  | { tier: 'convention'; note: string } // recruiter/industry norm, not a parser behaviour
  | { tier: 'folklore'; note: string }   // widely repeated, unverified — must not be 'critical'
```

Hard constraint: **`folklore` may never carry `critical` severity.** If a rule matters enough to be critical, it must be demonstrable by the round-trip harness in `08-scoring.md`. That harness is what converts a folklore rule into a measured one, and moving rules up the tiers is ongoing work, not a one-time setup.

The methodology page publishes the tier of every rule. No competitor does this, and it is cheap credibility.

## Jurisdiction

Resume conventions are regional, and several widely-repeated rules are US/UK-specific. Applying them globally would give wrong advice to exactly the markets named as a wedge in `05-competitive-analysis.md`.

| Convention | US / UK / CA / AU | DE / AT / CH | JP | PK / Gulf / IN |
| --- | --- | --- | --- | --- |
| Photo | omit | commonly expected | expected | commonly expected |
| Date of birth | omit | common | expected | common |
| Marital status / nationality | omit | occasional | common | common |
| Length | 1–2 pages | 2+ acceptable | prescribed format | 2+ acceptable |
| Signature / date on document | no | occasional | yes | occasional |

```ts
type Jurisdiction = 'US' | 'UK' | 'CA' | 'AU' | 'DE' | 'JP' | 'PK' | 'AE' | 'IN' | 'generic'
type Rule = { /* … */ jurisdictions?: Jurisdiction[] }   // undefined = universal
```

The user picks a target region; region-scoped rules only run when they apply. Where a convention conflicts with machine parsing — a photo is unparseable regardless of local norms — the finding states both: "expected in this market, but not extractable; keep it, and make sure nothing important is inside the image."

## Rule engine

Rules are pure functions over the document. No DOM access — testable, and runnable on imported documents before they are ever rendered.

```ts
type Severity = 'critical' | 'warning' | 'suggestion'
type Category = 'structure' | 'typography' | 'content' | 'contact' | 'dates' | 'output' | 'keywords'

type Rule = {
  id: string
  severity: Severity
  category: Category
  scope: RuleScope
  evidence: Evidence
  jurisdictions?: Jurisdiction[]
  title: string
  explain: string           // why this matters, plain language, no jargon
  check: (ctx: RuleContext) => Finding[]
  maxFindings?: number      // collapse beyond this; default 3
  blockedInSafeMode?: boolean
}

type RuleContext = {
  resume: Resume
  tokens: ThemeTokens
  resolvedText: string
  jurisdiction: Jurisdiction
  source: 'native' | 'foreign'
  extraction?: ExtractionResult   // present only after an export round-trip
  jobDescription?: string
}

type Finding = {
  ruleId: string
  severity: Severity
  message: string           // states the specific instance, not the rule name
  path: string              // "sections[2].items[0].bullets[3]" — click-to-focus
  fix?: Autofix
}

type Autofix = {
  label: string
  scope: 'single' | 'all'   // fix this one, or every instance of this rule
  apply: (r: Resume, t: Theme, path?: string) => { resume: Resume; theme: Theme }
}
```

### Noise control

Forty rules against a half-finished resume produces an unusable wall of red. This is the most likely way the linter fails as a product rather than as code.

- **Completeness gate.** Content and keyword rules do not run until the document has a name, contact details, and at least one experience item. Before that the panel shows what is still missing, not what is wrong.
- **Per-rule collapse.** More than `maxFindings` instances collapse into one entry with a count and a fix-all action.
- **Progressive disclosure.** `critical` always visible; `warning` behind a toggle that defaults on; `suggestion` behind a toggle that defaults off.
- **Never block typing.** Rules run debounced and off the input path.

## Rule catalogue

### Structure — foreign documents only

Native documents cannot violate these. On import or `/resume-checker` they are the highest-value checks in the product.

| id | Check | Severity | Evidence |
| --- | --- | --- | --- |
| `multi-column` | column clustering in extracted text positions | critical | measured |
| `layout-tables` | table structure carrying resume content | critical | measured |
| `text-boxes` | floating text frames in DOCX | critical | documented |
| `header-footer-content` | contact details inside the page header or footer | critical | measured |
| `image-only-text` | text rendered as image, no text layer | critical | measured |
| `unrecognised-sections` | no heading matches the synonym dictionary | warning | measured |
| `scanned-pdf` | no extractable text at all | critical | measured |

Note on `layout-tables`: modern parsers handle simple two-column tables better than the folklore suggests, but nested and merged cells still fail routinely, and the failure is silent. Critical is justified because the round-trip harness demonstrates it, not because it is traditional to say so.

### Output — measured, requires an export

These cannot be evaluated from the document model. They run after an export round-trip and are reported through the same panel.

| id | Check | Severity | Evidence |
| --- | --- | --- | --- |
| `reading-order` | extracted text order matches logical order | critical | measured |
| `field-recovery` | name, contact, and each role's title/org/dates survive extraction | critical | measured |
| `text-layer-present` | exported PDF has a real text layer | critical | measured |
| `encoding-clean` | no mojibake or replacement characters after extraction | critical | measured |
| `docx-no-tables` | generated DOCX contains no layout tables | critical | measured |

`field-recovery` is the single most valuable check in the product and is the one nobody else ships. Detail is in `08-scoring.md`.

### Contact

| id | Check | Severity | Scope | Evidence |
| --- | --- | --- | --- | --- |
| `has-email` | a syntactically valid email is present | critical | both | convention |
| `email-plausible` | not obviously a placeholder or a disposable domain | warning | both | convention |
| `has-phone` | phone present | critical | both | convention |
| `phone-format` | includes a country code when the target market is foreign | warning | both | convention |
| `name-first` | full name is the first text block in reading order | critical | both | measured |
| `name-plain` | no decorative characters or spacing inside the name | warning | both | measured |
| `link-plain-text` | URLs are literal text, not glyph-only links or shorteners | warning | both | measured |
| `location-granularity` | city and country are enough; a street address is unnecessary personal data | suggestion | both | convention |

### Dates

| id | Check | Severity | Scope | Evidence |
| --- | --- | --- | --- | --- |
| `date-format-consistent` | one format throughout | critical | both | measured |
| `date-separator` | `–` or `-`, not `—`, `to`, `through`, or `~` | warning | both | measured |
| `date-order` | end is not before start | critical | both | convention |
| `date-not-future` | no start date in the future | warning | both | convention |
| `present-keyword` | current role uses "Present" | warning | both | measured |
| `month-precision` | roles carry month and year, not a bare year | warning | both | measured |
| `reverse-chronological` | most recent role first | warning | both | convention |
| `gap-detection` | unexplained gaps over ~6 months are surfaced to the user | suggestion | both | convention |

`gap-detection` reports to the user only. It is never scored and never framed as a defect — employment gaps are normal, and a tool that penalises them is doing harm.

### Typography

| id | Check | Severity | Scope | Evidence |
| --- | --- | --- | --- | --- |
| `font-extractable` | font produces clean text on extraction | warning | both | measured |
| `font-embedded` | exported PDF embeds its fonts | critical | native | measured |
| `bullet-char-safe` | bullet is `•`, `-`, or `▪` | warning | both | measured |
| `no-glyph-substitution` | no decorative unicode standing in for letters | critical | foreign | measured |
| `sufficient-contrast` | contrast ratio at least 4.5:1 | warning | both | documented |
| `min-font-size` | body at least 9pt | suggestion | both | convention |
| `page-count` | length appropriate to experience and region | suggestion | both | convention |

`min-font-size` and `page-count` are human-readability conventions, not parser behaviour, and are categorised as suggestions for that reason. The previous draft filed them as ATS constraints, which was wrong.

### Content

Quality signals for the human reader. Reported separately and never folded into the parse-readiness figure — conflating "a machine can read this" with "this is well written" is precisely what makes competitor scores meaningless.

| id | Check | Severity | Evidence |
| --- | --- | --- | --- |
| `bullet-length` | roughly 1–2 lines; flag beyond ~220 characters | suggestion | convention |
| `bullet-count` | 3–6 per role | suggestion | convention |
| `starts-with-verb` | bullets open with an action verb | suggestion | convention |
| `weak-verbs` | flags "responsible for", "helped with", "worked on" | suggestion | convention |
| `has-metrics` | some proportion of bullets carry a number | suggestion | convention |
| `no-first-person` | flags "I", "my", "we" | suggestion | convention |
| `tense-consistency` | past roles in past tense, current in present | suggestion | convention |
| `acronym-expansion` | acronyms expanded on first use | suggestion | measured |
| `duplicate-bullets` | near-identical bullets across roles | suggestion | convention |
| `personal-data` | DOB, marital status, gender, nationality | varies | jurisdictional |

`personal-data` severity is region-dependent: `warning` in US/UK/CA/AU where it invites discrimination-screening problems, silent in DE/JP/PK/AE where it is conventional. Never `critical` anywhere — it is a judgement call belonging to the user.

Spell-checking is deliberately absent. Doing it properly needs a dictionary, proper-noun handling, and multi-language support; doing it badly means flagging every technology name on a developer's resume. The browser's native spellcheck already covers the editor fields. Revisit only if users ask.

### Keywords — informational, never scored

`keyword-coverage` runs only when a job description is pasted. Terms are extracted from the posting (n-grams filtered against a stopword list and a skills dictionary), matched with light stemming, and reported as a present/missing checklist.

Paired with an explicit warning against keyword stuffing. It is transparent to human readers and to semantic matchers, and it backfires.

## Safe Mode

When enabled, controls that would produce a `critical` violation are disabled with an inline explanation naming the rule and the reason. The user can switch it off; the linter keeps reporting.

Because native documents cannot produce most structural violations, Safe Mode governs a smaller surface than the previous draft implied — chiefly font selection, contrast, and any future layout options that would introduce columns. It should be framed as "these options are hidden because they break parsing", not as a mode that fixes something.

## Approved fonts

Arial, Helvetica, Calibri, Verdana, Tahoma, Trebuchet MS, Georgia, Cambria, Garamond, Times New Roman, Book Antiqua.

The list is not folklore — each entry has been round-tripped through the extraction harness. Any font that extracts cleanly qualifies; the list is short because it has been tested, not because other fonts are forbidden. Say that in the UI.

DOCX rendering depends on fonts installed on the reader's machine, so ship metrically-compatible webfonts for preview fidelity. PDF embeds, so it is unaffected.

## Scoring interaction

Full model in `08-scoring.md`. Constraints this catalogue imposes on it:

- Applicability-aware denominator: inapplicable rules are excluded, not passed.
- Repeated findings from one rule are capped in their scoring contribution, so twelve long bullets are not a worse outcome than a missing email address.
- Content findings never enter the parse-readiness figure.
- Jurisdictional rules that do not apply are absent, not zero.

## Building the catalogue honestly

The rules above are a starting hypothesis, not a finding. The plan for making them real:

1. Assemble a fixture corpus: resumes built in this tool plus exports from every major competitor.
2. Run each through the round-trip harness — own extractor, Apache Tika, poppler `pdftotext`.
3. For each rule, construct a violating and a clean variant, then measure whether the violation actually degrades extraction.
4. Promote rules that show an effect to `measured`. Demote rules that do not to `convention`, or delete them.
5. Publish the results.

Step 5 is also the original-research asset the SEO plan calls for. The rule catalogue and the content strategy are the same piece of work.
