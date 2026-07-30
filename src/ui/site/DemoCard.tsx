import type { ReactNode } from "react";
import css from "@/ui/site/site.module.css";

/**
 * The bordered card that carries a worked example: a title strip, one or two
 * panes, and a line of explanation underneath.
 *
 * Both the hero and the checker section were hand-rolling this shell, which is
 * how the two drifted apart in padding and label casing.
 */
export function DemoCard({
  title,
  footer,
  children,
  className = "",
}: {
  title: string;
  footer: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${css.demo} ${className}`}>
      <p className={css.demoHead}>{title}</p>
      <div className={css.demoBody}>{children}</div>
      <p className={css.demoFoot}>{footer}</p>
    </div>
  );
}

export function DemoPane({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={css.demoPane}>
      <p className={css.demoLabel}>{label}</p>
      {children}
    </div>
  );
}
