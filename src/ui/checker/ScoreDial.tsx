import { CEILING, type Score } from "@/extract";
import { PanelHead } from "./ReportPanels";
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

/* ------------------------------------------------------------------ *
 * Geometry
 *
 * Four inputs, everything else derived. The dial used to hard-code its radius,
 * its viewBox and its rotation as three separate numbers that had to agree, and
 * they did not: the gap came out at nine o'clock because the rotation was
 * computed from a different assumption than the sweep.
 * ------------------------------------------------------------------ */

/** Drawing size in user units. The CSS decides how big it renders. */
const SIZE = 176;
const STROKE = 8;
/**
 * How much of the circle the track covers.
 *
 * The remainder is left open, permanently. A closed ring filled to the top of
 * the scale reads as "100%", which is the one thing this score is careful never
 * to claim, and it contradicted the caveat printed directly underneath. The gap
 * is the part no parser publishes: the dial cannot be completed, because the
 * scale cannot be.
 */
const SWEEP_DEG = 280;

const CENTRE = SIZE / 2;
/** Inset by half the stroke, or the arc is clipped by the viewBox. */
const RADIUS = CENTRE - STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TRACK = CIRCUMFERENCE * (SWEEP_DEG / 360);

/**
 * Rotation that puts the middle of the gap at the bottom.
 *
 * An SVG circle is stroked from 3 o'clock, clockwise, so the drawn arc runs
 * from 0 to SWEEP_DEG and the gap is centred on the angle below. The bottom of
 * the circle is 90 degrees, because y grows downward.
 */
const GAP_CENTRE_DEG = SWEEP_DEG + (360 - SWEEP_DEG) / 2;
const START_DEG = 90 - GAP_CENTRE_DEG;

/**
 * The number, drawn.
 *
 * A dial rather than a bar: the score is the single answer this page exists to
 * give, and a bar at the top of a column reads as one measurement among
 * several. The arc is stroked with `stroke-dasharray`, so it needs no gradient
 * mask and animates by sweeping the offset back to zero.
 *
 * The scale's top is `CEILING`, imported from the scorer that produced the
 * value rather than restated here. It is the number the whole caveat is about,
 * so a second copy of it going stale is the one thing that would make this
 * panel lie.
 */
export function ScoreDial({ score }: { score: Score }) {
  const filled = (score.value / CEILING) * TRACK;

  return (
    <section className={`${css.panel} ${css.score} ${BAND_CLASS[score.band]}`}>
      {/* Ranged left like every other panel header, while the dial under it is
          centred: the header names the panel, it is not part of the readout. */}
      <PanelHead>Parse score</PanelHead>

      <div
        className={css.dial}
        role="img"
        aria-label={`${score.value} out of ${CEILING}. ${BAND_LABEL[score.band]}.`}
      >
        <svg
          className={css.dialSvg}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          style={{ transform: `rotate(${START_DEG}deg)` }}
        >
          <circle
            className={css.dialTrack}
            cx={CENTRE}
            cy={CENTRE}
            r={RADIUS}
            strokeWidth={STROKE}
            strokeDasharray={`${TRACK} ${CIRCUMFERENCE}`}
          />
          <circle
            className={css.dialArc}
            cx={CENTRE}
            cy={CENTRE}
            r={RADIUS}
            strokeWidth={STROKE}
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            style={{ "--arc-len": `${filled}px` } as React.CSSProperties}
          />
        </svg>
        {/* The number alone. The scale's top is stated in the aria-label and
            argued in the findings panel; printing it under the value made the
            dial look like a fraction rather than a reading. */}
        <div className={css.dialFace}>
          <span className={css.dialValue}>{score.value}</span>
        </div>
      </div>

      <span className={css.band}>{BAND_LABEL[score.band]}</span>
      <p className={css.verdict}>{score.verdict}</p>
    </section>
  );
}
