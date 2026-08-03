"use client";

import { useCallback, useState } from "react";
import { matchKeywords, type KeywordReport } from "@/extract";
import { PanelHead } from "./ReportPanels";
import css from "./console.module.css";

/**
 * Keyword overlap against a specific job posting.
 *
 * Kept out of the score, and the panel says so. A resume is not worse for not
 * matching a posting the person has not applied to, and mixing a match figure
 * into a parse figure is exactly what makes other tools' scores untrustworthy.
 * It sits here because 88% of employers report screening on exact criteria, so
 * the words in the posting genuinely matter, just not to the same number.
 */
export function MatchPanel({ resumeText }: { resumeText: string }) {
  const [posting, setPosting] = useState("");
  const [report, setReport] = useState<KeywordReport | null>(null);

  const compare = useCallback(() => {
    setReport(posting.trim() ? matchKeywords(posting, resumeText) : null);
  }, [posting, resumeText]);

  const clear = useCallback(() => {
    setPosting("");
    setReport(null);
  }, []);

  return (
    <section className={css.panel}>
      <PanelHead
        count={
          report?.usable
            ? `${report.matched} / ${report.terms.length}`
            : undefined
        }
      >
        Match against a posting
      </PanelHead>

      <p className={css.note}>
        Separate from the score, and it does not change it. The score is about
        whether your file can be read at all; this is about one posting.
      </p>

      <textarea
        className={css.jd}
        value={posting}
        onChange={(e) => setPosting(e.target.value)}
        placeholder="Paste the job description here."
        aria-label="Job description"
      />

      <div className={css.row}>
        <button
          type="button"
          className={css.btnPrimary}
          onClick={compare}
          disabled={!posting.trim()}
        >
          Compare
        </button>
        {report ? (
          <button type="button" className={css.btn} onClick={clear}>
            Clear
          </button>
        ) : null}
      </div>

      {report ? (
        !report.usable ? (
          /*
           * Say nothing rather than something wrong. A couple of words used to
           * produce a full report: "1 of 1 terms", and a stuffing warning,
           * because a resume naturally says a word more often than a one-word
           * posting does. Every figure in it was arithmetic on nothing.
           */
          <p className={css.note}>
            There is not enough of a posting there to compare against. Your
            resume is fine: it is the box above. Paste the whole posting, or at
            least its requirements section. A few words, or text that is not a
            posting, cannot say which terms matter.
          </p>
        ) : (
          <>
            <div className={css.meter} aria-hidden="true">
              <span style={{ width: `${Math.round(report.coverage * 100)}%` }} />
            </div>

            {/*
              Required coverage, reported on its own. Overall coverage flattens
              the difference between a wishlist item and a filter: eighteen of
              twenty-four is fine if none of the six were required, and trouble
              if all of them were.
            */}
            {report.requiredTotal ? (
              <p className={css.matchLead}>
                <strong>
                  {report.requiredMatched} of {report.requiredTotal}
                </strong>{" "}
                {report.requiredTotal === 1 ? "term" : "terms"} the posting
                calls for outright{" "}
                {report.requiredMatched === report.requiredTotal
                  ? "are all in your resume."
                  : "are in your resume."}
              </p>
            ) : null}

            {/* Ordered by what it costs to be missing, not by frequency. */}
            {report.priority.length ? (
              <ol className={css.priority}>
                {report.priority.map((t) => (
                  <li key={t.term} className={css.priorityRow}>
                    <span className={css.priorityTerm}>{t.term}</span>
                    <span
                      className={
                        t.emphasis === "required"
                          ? css.tagRequired
                          : css.tagPreferred
                      }
                    >
                      {t.emphasis === "required"
                        ? "required"
                        : t.emphasis === "preferred"
                          ? "nice to have"
                          : "mentioned"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {/* Requirements no word-overlap check can see. */}
            {report.demands.length ? (
              <ul className={css.demands}>
                {report.demands.map((d) => (
                  <li key={d.text} className={css.demandRow}>
                    <span className={css.demandKind}>{d.kind}</span>
                    <span>{d.text}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <ul className={css.terms}>
              {report.terms.map((t) => (
                <li
                  key={t.term}
                  className={`${css.term} ${
                    t.found
                      ? css.termFound
                      : t.nearMiss
                        ? css.termNear
                        : css.termMissing
                  } ${t.emphasis === "required" && !t.found ? css.termRequired : ""}`}
                  title={
                    (t.emphasis === "required"
                      ? "Required. "
                      : t.emphasis === "preferred"
                        ? "Nice to have. "
                        : "") +
                    (t.found
                      ? `In your resume ${t.found}×, asked for ${t.askedFor}×`
                      : t.nearMiss
                        ? `You wrote "${t.nearMiss}". The posting says "${t.term}".`
                        : `Asked for ${t.askedFor}× in the posting, not in your resume`)
                  }
                >
                  {t.term}
                  {t.found > 1 ? (
                    <span className={css.termCount}>×{t.found}</span>
                  ) : null}
                </li>
              ))}
            </ul>

            {/*
              What the colours mean, said out loud. Four states carried by
              colour and border alone read as one undifferentiated list to
              anyone who cannot separate them. The words are the legend; the
              swatches only illustrate them.
            */}
            <ul className={css.legend}>
              <li className={css.legendRow}>
                <span className={`${css.legendChip} ${css.termFound}`} />
                in your resume, with a count if more than once
              </li>
              <li className={css.legendRow}>
                <span
                  className={`${css.legendChip} ${css.termMissing} ${css.termRequired}`}
                />
                missing, and the posting requires it
              </li>
              <li className={css.legendRow}>
                <span className={`${css.legendChip} ${css.termMissing}`} />
                missing, but only nice to have
              </li>
              {report.nearMisses.length ? (
                <li className={css.legendRow}>
                  <span className={`${css.legendChip} ${css.termNear}`} />
                  present under another name, which a parser will not credit
                </li>
              ) : null}
            </ul>

            {/*
              Deliberately not counted as matches. The systems doing the
              screening match literal text, so scoring an abbreviation as a hit
              would flatter the number with something they will not credit.
            */}
            {report.nearMisses.length ? (
              <ul className={css.nearList}>
                {report.nearMisses.map((t) => (
                  <li key={t.term}>
                    The posting says <strong>{t.term}</strong>. You wrote{" "}
                    <strong>{t.nearMiss}</strong>. Use the posting&rsquo;s
                    wording.
                  </li>
                ))}
              </ul>
            ) : null}

            {report.overused.length ? (
              <p className={css.note}>
                Repeated more than the posting asks for:{" "}
                <strong>{report.overused.join(", ")}</strong>. Stuffing is
                obvious to a human reader and to modern matching, and it costs
                the interview.
              </p>
            ) : null}

            <p className={css.note}>
              Missing terms are worth adding only where they are honestly yours.
              A term you cannot talk about in an interview is worse than a gap.
            </p>
          </>
        )
      ) : null}
    </section>
  );
}
