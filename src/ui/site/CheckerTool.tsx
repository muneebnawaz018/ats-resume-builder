"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { depthNote, formatBytes, stageHandoff, type ResumeFormat } from "@/lib";
import {
  extract,
  matchKeywords,
  recoverFields,
  scoreExtraction,
  type Extraction,
  type KeywordReport,
  type Score,
} from "@/extract";
import { EXPORT_FORMATS, type ExportFormat } from "@/export";
import { ResumePicker } from "@/ui/site/ResumePicker";
import { SavedResumes } from "@/ui/site/SavedResumes";
import css from "@/ui/site/site.module.css";

/**
 * Pick a file, read it, score it, then get on with it.
 *
 * The picker is the first and widest thing on the page, because choosing a file
 * is the only action available until one is chosen. It used to sit in a 23rem
 * rail beside the report, which made the primary control the smallest object on
 * screen.
 */
type Picked = { file: File; format: ResumeFormat };

type State =
  | { phase: "idle" }
  | { phase: "reading"; name: string }
  | { phase: "done"; picked: Picked; result: Extraction }
  | { phase: "failed"; message: string };

/** Shown in place of the point value. See Deduction.severity. */
const SEVERITY_LABELS: Record<Score["deductions"][number]["severity"], string> = {
  blocking: "Blocking",
  high: "Major",
  medium: "Moderate",
  low: "Minor",
};

/** Long documents are truncated in the preview, never in the analysis. */
const PREVIEW_LIMIT = 4000;

export function CheckerTool() {
  const [state, setState] = useState<State>({ phase: "idle" });

  const run = useCallback(async (picked: Picked) => {
    setState({ phase: "reading", name: picked.file.name });
    try {
      const result = await extract(picked.file, picked.format);
      setState({ phase: "done", picked, result });
    } catch (error) {
      setState({
        phase: "failed",
        message:
          error instanceof Error ? error.message : "That file could not be read.",
      });
    }
  }, []);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  const done = state.phase === "done";
  const fields = done ? recoverFields(state.result) : [];
  const score = done
    ? scoreExtraction(
        state.result,
        fields,
        state.picked.file.size,
        state.picked.format.ext,
      )
    : null;

  return (
    <div className={css.tool}>
      {/*
        Once a report exists these two are the page's inputs: which file is
        being read, and which posting to read it against. They sit in one row
        so the posting box is reachable without scrolling past the report to
        find it, and stretch to a common height so the row reads as a pair
        rather than two unrelated cards.
      */}
      {done ? (
        <div className={css.toolInputs}>
          <div className={css.toolStack}>
            <ResumePicker
              onFile={run}
              onClear={reset}
              compact
              value={state.picked}
            />
            {/* What was read, beside the file it was read from. This used to
                sit down in the report, which put the file's name on screen
                twice and left this column mostly empty. */}
            <FilePanel picked={state.picked} result={state.result} />
          </div>
          <KeywordPanel resumeText={state.result.text} />
        </div>
      ) : (
        <ResumePicker onFile={run} onClear={reset} />
      )}

      {/* Only offered before a report exists; afterwards the page is the
          report, and a second way in would compete with reading it. */}
      {state.phase === "idle" ? (
        <SavedResumes onPick={run} />
      ) : null}

      {state.phase === "reading" ? (
        <p className={css.toolStatus} role="status">
          Reading {state.name}…
        </p>
      ) : null}

      {state.phase === "failed" ? (
        <p className={css.toolFailed} role="alert">
          {state.message}
        </p>
      ) : null}

      {done && score ? (
        <>
          <BlockerPanel blockers={score.blockers} />
          <ScoreCard score={score} />

          <div className={css.toolSplit}>
            <FieldsPanel fields={fields} />
            <FindingsPanel score={score} result={state.result} />
          </div>

          <NextPanel name={state.picked.file.name} result={state.result} />
        </>
      ) : null}
    </div>
  );
}

/**
 * Sits above the score and outside it.
 *
 * A file the portal refuses never reaches a parser, so how well it would have
 * parsed is beside the point until they re-export. The score still renders
 * underneath, because the content advice survives the conversion.
 */
function BlockerPanel({ blockers }: { blockers: Score["blockers"] }) {
  if (blockers.length === 0) return null;

  return (
    <section className={css.blockerPanel} role="alert">
      {blockers.map((b) => (
        <div key={b.label}>
          <p className={css.blockerTitle}>{b.label}</p>
          <p className={css.blockerDetail}>{b.detail}</p>
        </div>
      ))}
      <p className={css.blockerNote}>
        Fix this first. The score below still applies to the content, and carries
        over when you re-export.
      </p>
    </section>
  );
}

/** The number, the verdict, and the caveat. Facts about the file live below. */
function ScoreCard({ score }: { score: Score }) {
  return (
    <section className={`${css.scoreCard} ${css[`score-${score.band}`]}`}>
      <div className={css.scoreMain}>
        <p className={css.scoreNumber}>
          <strong>{score.value}</strong>
          <span>/98</span>
        </p>

        <div className={css.scoreCopy}>
          <p className={css.scoreVerdict}>{score.verdict}</p>
        </div>
      </div>

      <div
        className={css.scoreBar}
        role="img"
        aria-label={`${score.value} out of 98`}
      >
        <span style={{ width: `${(score.value / 98) * 100}%` }} />
      </div>

      {/*
        The ceiling and the caveat both stated up front. Every "ATS score" on
        the internet is somebody's guess presented as a measurement, and the
        only thing separating this one is that its reasons are traceable.
      */}
      <p className={css.scoreCaveat}>
        98 is the ceiling, not 100: no parser publishes its rules, so a perfect
        score would be a claim about software nobody outside those companies can
        see. Every deduction below cites its source.
      </p>
    </section>
  );
}

/**
 * What the file is. Separate from the score on purpose: the score is a
 * judgement, and these are the plain facts it was formed from.
 */
/**
 * What came out of the file, sat directly beneath it.
 *
 * The name is deliberately absent: it is on the bar immediately above this,
 * and printing it twice in one column reads as a mistake. Everything here is
 * measured from the extraction rather than claimed about the format.
 */
function FilePanel({ picked, result }: { picked: Picked; result: Extraction }) {
  const words = result.text.trim() ? result.text.trim().split(/\s+/).length : 0;

  const facts: [string, string][] = [
    ["format", picked.format.label],
    ["size", formatBytes(picked.file.size)],
    ...(result.pages
      ? ([["pages", String(result.pages)]] as [string, string][])
      : []),
    // Only PDFs carry the notion, so the row is absent rather than guessed at
    // for a format where it would always read "yes".
    ...(result.hasTextLayer === undefined
      ? []
      : ([
          ["text layer", result.hasTextLayer ? "readable" : "none found"],
        ] as [string, string][])),
    ["recovered", `${words.toLocaleString()} words · ${result.blocks.length} blocks`],
  ];

  return (
    <section className={css.panel}>
      <h3 className={css.panelTitle}>What was read</h3>
      <dl className={css.facts}>
        {facts.map(([k, v]) => (
          <div key={k} className={css.factRow}>
            <dt className={css.factKey}>{k}</dt>
            <dd className={css.factVal}>{v}</dd>
          </div>
        ))}
      </dl>
      {/* Which checks this format can support at all, so a skipped check is
          never mistaken for a passed one. */}
      <p className={css.panelNote}>{depthNote(result.depth)}</p>
    </section>
  );
}

function FieldsPanel({
  fields,
}: {
  fields: ReturnType<typeof recoverFields>;
}) {
  const found = fields.filter((f) => f.value !== null).length;

  return (
    <section className={css.panel}>
      {/*
        "Finds", not "recovers". Nothing was repaired: the file was read, and
        these are the values a parser comes away with.
      */}
      <h3 className={css.panelTitle}>
        What a parser finds
        <span className={css.panelCount}>
          {found} of {fields.length}
        </span>
      </h3>
      <dl className={css.facts}>
        {fields.map((f) => (
          <div
            key={f.key}
            className={`${css.factRow} ${f.value === null ? css.factRowMissing : ""}`}
          >
            <dt className={css.factKey}>{f.key}</dt>
            <dd className={f.value === null ? css.factMissing : css.factVal}>
              {f.value ?? f.lost ?? "not found"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FindingsPanel({
  score,
  result,
}: {
  score: Score;
  result: Extraction;
}) {
  return (
    <section className={css.panel}>
      <h3 className={css.panelTitle}>
        {score.deductions.length
          ? "What is costing you points"
          : "Nothing to change"}
        {score.deductions.length ? (
          <span className={css.panelCount}>
            {score.deductions.length} to fix
          </span>
        ) : null}
      </h3>

      {score.deductions.length ? (
        <ul className={css.findingList}>
          {score.deductions.map((d) => (
            <li key={d.label} className={css.finding}>
              {/*
                Severity, not the point value. The weights are the one part of
                the scoring that is ours rather than cited, and publishing a
                price list invites tuning the number instead of fixing the
                document. The order still reflects the weights exactly.
              */}
              <span className={`${css.findingRank} ${css[`rank-${d.severity}`]}`}>
                {SEVERITY_LABELS[d.severity]}
              </span>
              <span className={css.findingKind}>{d.label}</span>
              <span className={css.findingBody}>{d.detail}</span>
              <a
                className={css.findingSource}
                href={d.basis.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {d.basis.source}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className={css.findingBody}>
          Nothing in this file is likely to confuse a parser.
        </p>
      )}

      {score.skipped.length ? (
        <p className={css.panelNote}>
          Not scored, because this format cannot fail them:{" "}
          {score.skipped.join(", ").toLowerCase()}. {depthNote(result.depth)}
        </p>
      ) : null}

      {score.sources.length ? (
        <details className={css.rawText}>
          <summary>Where these weights come from</summary>
          <ul className={css.sourceList}>
            {score.sources.map((b) => (
              <li key={b.url + b.claim}>
                <p className={css.sourceClaim}>{b.claim}</p>
                <a href={b.url} target="_blank" rel="noopener noreferrer">
                  {b.source}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/*
        The extracted text itself, because every claim above is checkable
        against it. A report that cannot be audited is asking to be trusted.
      */}
      <details className={css.rawText}>
        <summary>Show the text exactly as it came out</summary>
        <pre>{result.text.slice(0, PREVIEW_LIMIT) || "(nothing)"}</pre>
      </details>
    </section>
  );
}

/**
 * Keyword overlap against a specific job posting.
 *
 * Kept out of the score, and the panel says so. A resume is not worse for not
 * matching a posting the person has not applied to, and mixing a match figure
 * into a parse figure is exactly what makes other tools' scores untrustworthy.
 * It sits here because 88% of employers report screening on exact criteria, so
 * the words in the posting genuinely matter, just not to the same number.
 */
function KeywordPanel({ resumeText }: { resumeText: string }) {
  const [posting, setPosting] = useState("");
  const [report, setReport] = useState<KeywordReport | null>(null);

  const compare = useCallback(() => {
    setReport(posting.trim() ? matchKeywords(posting, resumeText) : null);
  }, [posting, resumeText]);

  return (
    <section className={css.panel}>
      <h3 className={css.panelTitle}>
        Match against a job posting
        {report?.usable ? (
          <span className={css.panelCount}>
            {report.matched} of {report.terms.length} terms
          </span>
        ) : null}
      </h3>

      <p className={css.panelNote}>
        Separate from the score above, and it does not change it. The score is
        about whether your file can be read at all; this is about one posting.
      </p>

      <textarea
        className={css.jdInput}
        value={posting}
        onChange={(e) => setPosting(e.target.value)}
        placeholder="Paste the job description here."
        rows={4}
        aria-label="Job description"
      />

      <div className={css.actions}>
        <button
          type="button"
          className={css.actionPrimary}
          onClick={compare}
          disabled={!posting.trim()}
        >
          Compare
        </button>
        {report ? (
          <button
            type="button"
            className={css.actionGhost}
            onClick={() => {
              setPosting("");
              setReport(null);
            }}
          >
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
          <p className={css.panelNote}>
            That is too short to compare against. Paste the whole posting, or at
            least its requirements section. A few words cannot say which terms
            matter.
          </p>
        ) : (
          <>
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
              <ol className={css.priorityList}>
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
              <ul className={css.demandList}>
                {report.demands.map((d) => (
                  <li key={d.text} className={css.demandRow}>
                    <span className={css.demandKind}>{d.kind}</span>
                    <span>{d.text}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <ul className={css.termList}>
              {report.terms.map((t) => (
                <li
                  key={t.term}
                  className={`${css.term} ${
                    t.found
                      ? css.termFound
                      : t.nearMiss
                        ? css.termNear
                        : css.termMissing
                  } ${t.emphasis === "required" ? css.termRequired : ""}`}
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
                    <span className={css.termCount}>{t.found}</span>
                  ) : null}
                </li>
              ))}
            </ul>

            {/*
              Deliberately not counted as matches. The systems doing the
              screening match literal text, so scoring an abbreviation as a hit
              would flatter the number with something they will not credit.
            */}
            {report.nearMisses.length ? (
              <ul className={css.nearList}>
                {report.nearMisses.map((t) => (
                  <li key={t.term} className={css.nearRow}>
                    The posting says <strong>{t.term}</strong>. You wrote{" "}
                    <strong>{t.nearMiss}</strong>. Use the posting&rsquo;s wording.
                  </li>
                ))}
              </ul>
            ) : null}

            {report.overused.length ? (
              <p className={css.panelNote}>
                Repeated more than the posting asks for:{" "}
                <strong>{report.overused.join(", ")}</strong>. Stuffing is
                obvious to a human reader and to modern matching, and it costs
                the interview.
              </p>
            ) : null}

            <p className={css.panelNote}>
              Missing terms are worth adding only where they are honestly yours.
              A term you cannot talk about in an interview is worse than a gap.
            </p>
          </>
        )
      ) : null}
    </section>
  );
}

/**
 * What to do about it: fix it, or convert it.
 *
 * The download buttons used to read "Word" and "Markdown" under a label saying
 * "Save a copy as", which looks like a format switch rather than an action, so
 * the file arriving in the downloads folder was a surprise. They now name the
 * extension, carry a download arrow, and say what was written afterwards.
 */
function NextPanel({ name, result }: { name: string; result: Extraction }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openInEditor = useCallback(async () => {
    setBusy("editor");
    setError(null);
    try {
      const { toResume } = await import("@/extract/toResume");
      const resume = toResume(result, name);
      if (!stageHandoff(resume)) {
        throw new Error(
          "This browser will not hold the document between pages. Download it instead.",
        );
      }
      router.push("/resume-builder");
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : "That did not work.");
    }
  }, [name, result, router]);

  const save = useCallback(
    async (format: ExportFormat) => {
      setBusy(format.ext);
      setError(null);
      setSaved(null);
      try {
        const [{ toResume }, { download }, { stem }] = await Promise.all([
          import("@/extract/toResume"),
          import("@/export"),
          import("@/export/model"),
        ]);
        const resume = toResume(result, name);
        await download(resume, format);
        setSaved(`${stem(resume)}${format.ext}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "That did not work.");
      } finally {
        setBusy(null);
      }
    },
    [name, result],
  );

  const empty = !result.text.trim();

  return (
    <section className={css.panel}>
      <h3 className={css.panelTitle}>What next</h3>

      <div className={css.nextRow}>
        <div className={css.nextItem}>
          <button
            type="button"
            className={css.actionPrimary}
            onClick={openInEditor}
            disabled={empty || busy !== null}
          >
            {busy === "editor" ? "Opening…" : "Fix it in the editor"}
          </button>
          <p className={css.actionNote}>
            Opens what was read above as an editable document. Nothing is sent
            anywhere.
          </p>
        </div>

        <div className={css.nextItem}>
          <p className={css.nextLabel}>
            Or convert it. Each of these writes a file straight to your
            downloads.
          </p>
          <div className={css.actionSaves}>
            {EXPORT_FORMATS.map((f) => (
              <button
                key={f.ext}
                type="button"
                className={css.actionGhost}
                onClick={() => save(f)}
                disabled={empty || busy !== null}
                title={f.note}
              >
                <DownloadIcon />
                {busy === f.ext ? "Saving…" : `${f.label} (${f.ext})`}
              </button>
            ))}
          </div>

          {saved ? (
            <p className={css.actionSaved} role="status">
              Saved <strong>{saved}</strong> to your downloads.
            </p>
          ) : null}
        </div>
      </div>

      {empty ? (
        <p className={css.actionNote}>
          There is no text to carry over. Export the original as a PDF with a
          text layer and try again.
        </p>
      ) : null}

      {error ? (
        <p className={css.toolFailed} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4v11m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
