# Data Schema

Two independent documents: **content** (`Resume`) and **presentation** (`Theme`). They are never mixed. Any resume renders under any theme. This separation is what makes theme sharing, template switching, and multi-format export possible without duplicated logic.

All schemas are validated with Zod at load time so that a corrupt or outdated localStorage entry cannot crash the editor.

## Versioning

Every persisted document carries `schemaVersion`. Migrations are a pure function chain:

```ts
type Migration = (doc: unknown) => unknown
const migrations: Record<number, Migration> = { 1: v1_to_v2, 2: v2_to_v3 }
```

Never mutate an existing version's shape. Add a version and a migration.

## Resume

```ts
type Resume = {
  schemaVersion: number
  id: string                  // uuid
  name: string                // user-facing label, e.g. "Backend. Series B startups"
  createdAt: string           // ISO
  updatedAt: string           // ISO
  themeId: string             // ref into theme store
  basics: Basics
  sections: Section[]         // ordered; order in array IS render order
  meta: {
    targetRole?: string
    targetJobDescription?: string   // pasted posting, used by keyword matcher
    notes?: string
  }
}

type Basics = {
  fullName: string
  headline?: string           // "Senior Backend Engineer"
  email?: string
  phone?: string
  location?: string           // "Karachi, PK", city/country only, never street
  links: Link[]               // LinkedIn, GitHub, portfolio
  summary?: RichText
}

type Link = {
  id: string
  label: string               // "LinkedIn"
  url: string
  displayAs: 'url' | 'label' | 'both'
}
```

## Sections

A section is a typed container. `type` selects the renderer and the field set; `custom` allows a user-defined field set. This is what makes the builder open-ended rather than a fixed template.

```ts
type SectionType =
  | 'experience' | 'education' | 'skills' | 'projects'
  | 'certifications' | 'publications' | 'awards'
  | 'languages' | 'volunteer' | 'references'
  | 'text'        // freeform block
  | 'custom'      // user-defined fields

type Section = {
  id: string
  type: SectionType
  title: string               // user-editable, e.g. "EXPERIENCE" or "WORK HISTORY"
  visible: boolean
  items: SectionItem[]
  fieldSchema?: CustomField[] // only for type === 'custom'
  overrides?: Partial<Theme['tokens']>  // per-section theme override
}

type CustomField = {
  id: string
  key: string
  label: string
  kind: 'text' | 'richtext' | 'date' | 'daterange' | 'url' | 'list'
}
```

### Item shapes by type

```ts
type ExperienceItem = {
  id: string
  visible: boolean
  role: string
  organization: string
  location?: string
  start: DateValue
  end: DateValue | 'present'
  bullets: RichText[]
  tech?: string[]             // optional inline tech line
}

type EducationItem = {
  id: string; visible: boolean
  degree: string
  institution: string
  location?: string
  start?: DateValue
  end?: DateValue
  detail?: RichText[]         // honours, GPA, coursework
}

type SkillGroup = {
  id: string; visible: boolean
  label: string               // "Languages", "Cloud"
  items: string[]
}

type ProjectItem = {
  id: string; visible: boolean
  name: string
  url?: string
  start?: DateValue; end?: DateValue
  bullets: RichText[]
  tech?: string[]
}

type SimpleItem = {            // certifications, awards, publications, languages
  id: string; visible: boolean
  title: string
  subtitle?: string
  date?: DateValue
  detail?: RichText
}

type CustomItem = {
  id: string; visible: boolean
  values: Record<string, unknown>   // keyed by CustomField.key
}
```

### DateValue

Stored structured, formatted at render time by a theme token. Never store display strings; that would break reformatting and locale changes.

```ts
type DateValue = { year: number; month?: number }  // month 1-12
```

### RichText

Deliberately constrained. ATS parsers do not understand arbitrary markup, and a full rich text model is the single largest source of complexity in editors like this.

Allowed inline marks: **bold**, *italic*, link. Nothing else. No colour, no font changes, no nested lists, no tables.

```ts
type RichText = { spans: Span[] }
type Span = {
  text: string
  bold?: boolean
  italic?: boolean
  href?: string
}
```

Rationale: this maps 1:1 onto DOCX runs (`<w:r>` with `<w:b/>`, `<w:i/>`) and onto HTML `<strong>`/`<em>`/`<a>`. A richer model would require a translation layer for every export target and would let users produce ATS-hostile output.

## Theme

Flat token bag. Every token becomes a CSS custom property on the preview root, so editing a token is a style recalculation with no React re-render of content.

```ts
type Theme = {
  schemaVersion: number
  id: string
  name: string
  builtin: boolean            // built-ins are read-only; editing forks a copy
  tokens: ThemeTokens
}

type ThemeTokens = {
  // Page
  pageSize: 'Letter' | 'A4'
  marginTop: Length; marginRight: Length; marginBottom: Length; marginLeft: Length
  showPageNumbers: boolean

  // Type
  fontFamily: string          // from a curated ATS-safe list
  fontSizeBase: Length        // 9-12pt
  typeScale: number           // 1.0-1.4, drives heading sizes
  lineHeight: number          // 1.0-1.8
  headingWeight: 400 | 500 | 600 | 700
  headingCase: 'none' | 'upper' | 'capitalize'
  headingAlign: 'left' | 'center'
  nameSize: Length
  nameWeight: 400 | 600 | 700
  nameAlign: 'left' | 'center'

  // Rhythm
  sectionGap: Length
  itemGap: Length
  bulletGap: Length
  paragraphGap: Length

  // Rules
  headingRule: 'none' | 'full' | 'underText'
  ruleWeight: Length
  ruleColor: Color
  ruleGap: Length

  // Colour
  colorText: Color
  colorHeading: Color
  colorMuted: Color
  colorAccent: Color
  colorLink: Color

  // Layout
  dateAlign: 'inline' | 'right'
  locationAlign: 'inline' | 'right'
  contactSeparator: string    // " | ", " • "
  contactLayout: 'inline' | 'stacked'

  // Bullets
  bulletChar: string          // "•" "-" "▪"
  bulletIndent: Length
  bulletHangingIndent: boolean

  // Density preset shortcut (writes to the above)
  density: 'compact' | 'normal' | 'relaxed' | 'custom'
}

type Length = { value: number; unit: 'pt' | 'px' | 'em' | 'in' | 'mm' }
type Color  = string          // hex
```

### Per-section overrides

`Section.overrides` is a partial `ThemeTokens`. Resolution order at render:

```text
sectionOverride ?? theme.tokens ?? builtinDefault
```

Implemented as a nested CSS custom property scope: the section element re-declares only the overridden properties. No cascade gymnastics in JS.

## Application state (not persisted as document)

```ts
type AppState = {
  resumes: Record<string, Resume>
  themes: Record<string, Theme>
  activeResumeId: string | null
  ui: {
    selectedSectionId: string | null
    zoom: number
    safeMode: boolean
    panel: 'content' | 'design' | 'ats' | 'versions'
  }
  history: { past: Patch[]; future: Patch[] }   // undo/redo
}
```

Undo/redo stores immer patches, not full snapshots. Full snapshots of a resume are cheap, but patches keep the history array bounded and make the diff view trivial to build later.
