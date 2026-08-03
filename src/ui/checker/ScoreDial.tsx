import type { Score } from "@/extract";
import css from "./console.module.css";

const BAND_CLASS: Record<Score["band"], string> = {
  clean: css.bandClean,
  minor: css.bandMinor,
  risky: css.bandRisky,
  broken: css.bandBroken,
};

const BAND_LABEL: Record<Score["band"], string> = {
  clean: "Parses clean",
  minor: "Minor issues",
  risky: "At risk",
  broken: "Breaks",
};

/** The scale's ceiling. 98, not 100, and the caveat below says why. */
const MAX = 98;

const R = 76;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * The number, drawn.
 *
 * A ring rather than a bar: the score is the single answer this page exists to
 * give, and a bar at the top of a column reads as one measurement among
 * several. The arc is stroked with `stroke-dasharray`, so it needs no gradient
 * mask and animates by sweeping the offset back to zero.
 */
export function ScoreDial({ score }: { score: Score }) {
  const filled = (score.value / MAX) * CIRCUMFERENCE;

  return (
    <section className={`${css.panel} ${css.score} ${BAND_CLASS[score.band]}`}>
      <div
        className={css.dial}
        role="img"
        aria-label={`${score.value} out of ${MAX}. ${BAND_LABEL[score.band]}.`}
      >
        <svg className={css.dialSvg} viewBox="0 0 176 176" aria-hidden="true">
          <circle className={css.dialTrack} cx="88" cy="88" r={R} />
          <circle
            className={css.dialArc}
            cx="88"
            cy="88"
            r={R}
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            style={{ "--arc-len": `${filled}px` } as React.CSSProperties}
          />
        </svg>
        <div className={css.dialFace}>
          <span className={css.dialValue}>{score.value}</span>
          <span className={css.dialMax}>/ {MAX}</span>
        </div>
      </div>

      <span className={css.band}>{BAND_LABEL[score.band]}</span>
      <p className={css.verdict}>{score.verdict}</p>

      {/*
        The ceiling and the caveat stated up front. Every "ATS score" on the
        internet is somebody's guess presented as a measurement, and the only
        thing separating this one is that its reasons are traceable.
      */}
      <p className={css.caveat}>
        {MAX} is the ceiling, not 100: no parser publishes its rules, so a
        perfect score would be a claim about software nobody outside those
        companies can see. Every finding cites its source.
      </p>
    </section>
  );
}
