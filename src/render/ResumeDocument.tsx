import type { Resume } from "@/schema/resume";
import type { Theme, ThemeOverrides } from "@/schema/theme";
import css from "./document.module.css";
import { RichText } from "./RichText";
import { SectionBody } from "./sections/SectionBody";
import { overridesToCssVars, tokensToCssVars, type CssVars } from "./tokens";

/**
 * The resume document.
 *
 * A pure function of (resume, theme). No store access, no MUI, no Emotion.
 * The same tree serves the on-screen preview and the print output, which is
 * what makes exported PDF match what the user saw.
 */
export function ResumeDocument({
  resume,
  theme,
  onSelect,
}: {
  resume: Resume;
  theme: Theme;
  onSelect?: (path: string) => void;
}) {
  const t = theme.tokens;
  const vars = tokensToCssVars(t) as React.CSSProperties;

  const contactParts = [
    resume.basics.email,
    resume.basics.phone,
    resume.basics.location,
    ...resume.basics.links.map((l) =>
      l.displayAs === "label" ? l.label : l.url,
    ),
  ].filter((s): s is string => Boolean(s));

  const ruleClass =
    t.headingRule === "full"
      ? css.ruleFull
      : t.headingRule === "underText"
        ? css.ruleUnderText
        : undefined;

  return (
    <article
      className={css.doc}
      style={vars}
      role="document"
      aria-label="Resume preview"
      onClick={
        onSelect
          ? (e) => {
              const el = (e.target as HTMLElement).closest("[data-path]");
              if (el) onSelect(el.getAttribute("data-path") as string);
            }
          : undefined
      }
    >
      <header className={css.header} data-path="basics">
        <h1 className={css.name}>{resume.basics.fullName}</h1>
        {resume.basics.headline ? (
          <div className={css.headline}>{resume.basics.headline}</div>
        ) : null}

        {contactParts.length > 0 ? (
          <div
            className={
              t.contactLayout === "stacked" ? css.contactStacked : css.contact
            }
          >
            {t.contactLayout === "stacked"
              ? contactParts.map((p, i) => <span key={i}>{p}</span>)
              : contactParts.map((p, i) => (
                  <span key={i}>
                    {i > 0 ? (
                      <span className={css.sep}>{t.contactSeparator}</span>
                    ) : null}
                    {p}
                  </span>
                ))}
          </div>
        ) : null}

        {resume.basics.summary ? (
          <p className={css.summary} data-path="basics.summary">
            <RichText value={resume.basics.summary} />
          </p>
        ) : null}
      </header>

      {resume.sections
        .filter((s) => s.visible)
        .map((section, si) => {
          const path = `sections[${si}]`;
          const overrides = section.overrides as ThemeOverrides | undefined;
          // Section overrides re-declare only the changed custom properties on
          // this element. The cascade does the resolution, not JS.
          const scoped = overrides
            ? (overridesToCssVars(overrides) as CssVars as React.CSSProperties)
            : undefined;

          return (
            <section
              className={css.section}
              key={section.id}
              style={scoped}
              data-path={path}
            >
              <h2 className={`${css.sectionTitle} ${ruleClass ?? ""}`}>
                {section.title}
              </h2>
              <SectionBody
                section={section}
                tokens={{ ...t, ...(overrides ?? {}) }}
                path={path}
              />
            </section>
          );
        })}
    </article>
  );
}
