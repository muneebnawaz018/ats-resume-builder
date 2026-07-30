import { formatDate, formatDateRange } from "@/lib";
import type {
  EducationItem,
  ExperienceItem,
  ProjectItem,
  Section,
  SimpleItem,
  SkillGroup,
  TextItem,
} from "@/schema";
import type { ThemeTokens } from "@/schema";
import { RichText } from "@/render/RichText";
import css from "../document.module.css";
import { Bullets, ItemHead } from "./parts";

type Props = { section: Section; tokens: ThemeTokens; path: string };

/**
 * Dispatches on section type. Each branch is a plain function of data and
 * tokens — no store access, so the same renderer serves preview, print, and
 * any future export that walks the tree.
 */
export function SectionBody({ section, tokens, path }: Props) {
  const visible = section.items.filter(
    (i) => (i as { visible?: boolean }).visible !== false,
  );
  if (visible.length === 0) return null;

  const wrap = (i: number, node: React.ReactNode) => (
    <div className={css.item} key={i} data-path={`${path}.items[${i}]`}>
      {node}
    </div>
  );

  switch (section.type) {
    case "experience":
      return (
        <div className={css.sectionBody}>
          {visible.map((raw, i) => {
            const it = raw as ExperienceItem;
            return wrap(
              i,
              <>
                <ItemHead
                  title={it.role}
                  subtitle={[it.organization, it.location]
                    .filter(Boolean)
                    .join(", ")}
                  meta={formatDateRange(it.start, it.end)}
                  dateAlign={tokens.dateAlign}
                />
                <Bullets
                  items={it.bullets}
                  bulletChar={tokens.bulletChar}
                  path={`${path}.items[${i}]`}
                />
                {it.tech?.length ? (
                  <div className={css.tech}>{it.tech.join(" · ")}</div>
                ) : null}
              </>,
            );
          })}
        </div>
      );

    case "education":
      return (
        <div className={css.sectionBody}>
          {visible.map((raw, i) => {
            const it = raw as EducationItem;
            return wrap(
              i,
              <>
                <ItemHead
                  title={it.degree}
                  subtitle={[it.institution, it.location]
                    .filter(Boolean)
                    .join(", ")}
                  meta={formatDateRange(it.start, it.end)}
                  dateAlign={tokens.dateAlign}
                />
                <Bullets
                  items={it.detail}
                  bulletChar={tokens.bulletChar}
                  path={`${path}.items[${i}]`}
                />
              </>,
            );
          })}
        </div>
      );

    case "projects":
      return (
        <div className={css.sectionBody}>
          {visible.map((raw, i) => {
            const it = raw as ProjectItem;
            return wrap(
              i,
              <>
                <ItemHead
                  title={it.name}
                  subtitle={it.url}
                  meta={formatDateRange(it.start, it.end)}
                  dateAlign={tokens.dateAlign}
                />
                <Bullets
                  items={it.bullets}
                  bulletChar={tokens.bulletChar}
                  path={`${path}.items[${i}]`}
                />
                {it.tech?.length ? (
                  <div className={css.tech}>{it.tech.join(" · ")}</div>
                ) : null}
              </>,
            );
          })}
        </div>
      );

    case "skills":
      return (
        <div className={css.sectionBody}>
          {visible.map((raw, i) => {
            const g = raw as SkillGroup;
            return (
              <div
                className={css.skillGroup}
                key={i}
                data-path={`${path}.items[${i}]`}
              >
                {g.label ? (
                  <span className={css.skillLabel}>{g.label}: </span>
                ) : null}
                <span>{g.items.join(", ")}</span>
              </div>
            );
          })}
        </div>
      );

    case "text":
      return (
        <div className={css.sectionBody}>
          {visible.map((raw, i) => {
            const it = raw as TextItem;
            return wrap(i, <RichText value={it.body} />);
          })}
        </div>
      );

    default:
      // certifications, publications, awards, languages, volunteer, references
      return (
        <div className={css.sectionBody}>
          {visible.map((raw, i) => {
            const it = raw as SimpleItem;
            return wrap(
              i,
              <>
                <ItemHead
                  title={it.title}
                  subtitle={it.subtitle}
                  meta={formatDate(it.date)}
                  dateAlign={tokens.dateAlign}
                />
                {it.detail ? (
                  <div>
                    <RichText value={it.detail} />
                  </div>
                ) : null}
              </>,
            );
          })}
        </div>
      );
  }
}
