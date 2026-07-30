"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { depthNote, formatBytes, stageHandoff, type ResumeFormat } from "@/lib";
import {
  extract,
  recoverFields,
  scoreExtraction,
  type Extraction,
  type Score,
} from "@/extract";
import { EXPORT_FORMATS, type ExportFormat } from "@/export";
import { ResumePicker } from "@/ui/site/ResumePicker";
import css from "@/ui/site/site.module.css";

/**
 * Pick a file, read it, score it, then get on with it.
 *
 * Laid out as a summary rail beside a body once the viewport allows: what the
 * file is and what it scored on the left, what was found and what to change on
 * the right. One column below 1080px, in that same order.
 */
type Picked = { file: File; format: ResumeFormat };

type State =
  | { phase: "idle" }
  | { phase: "reading"; name: string }
  | { phase: "done"; picked: Picked; result: Extraction }
  | { phase: "failed"; message: string };

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
  const score = done ? scoreExtraction(state.result, fields) : null;

  return (
    // Nothing to put beside the picker yet, so the frame stays narrow rather
    // than stranding one card in a 23rem rail on a wide screen.
    <div className={`${css.tool} ${done ? css.toolWide : css.toolNarrow}`}>
      <div className={css.toolAside}>
        <ResumePicker onFile={run} onClear={reset} />

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
            <ScoreCard score={score} />
            <FilePanel picked={state.picked} result={state.result} />
          </>
        ) : null}
      </div>

      {done && score ? (
        <div className={css.toolMain}>
          <FieldsPanel fields={fields} />
          <FindingsPanel score={score} result={state.result} />
          <ActionsPanel name={state.picked.file.name} result={state.result} />
        </div>
      ) : null}
    </div>
  );
}

function ScoreCard({ score }: { score: Score }) {
  return (
    <section className={`${css.scoreCard} ${css[`score-${score.band}`]}`}>
      <div className={css.scoreTop}>
        <p className={css.scoreNumber}>
          <strong>{score.value}</strong>
          <span>/100</span>
        </p>
      </div>

      <p className={css.scoreVerdict}>{score.verdict}</p>

      <div
        className={css.scoreBar}
        role="img"
        aria-label={`${score.value} out of 100`}
      >
        <span style={{ width: `${score.value}%` }} />
      </div>

      {/*
        Said plainly rather than buried in a tooltip. Every "ATS score" on the
        internet is somebody's guess, and pretending otherwise is the thing
        that makes them worthless.
      */}
      <p className={css.scoreCaveat}>
        Scored by this parser, not by a named vendor. It measures what can be
        read out of your file, which is where every one of them starts.
      </p>
    </section>
  );
}

function FilePanel({
  picked,
  result,
}: {
  picked: Picked;
  result: Extraction;
}) {
  const facts: [string, string][] = [
    ["file", picked.file.name],
    ["format", picked.format.label],
    ["size", formatBytes(picked.file.size)],
    ...(result.pages
      ? ([["pages", String(result.pages)]] as [string, string][])
      : []),
    ["text", `${result.blocks.length} blocks · ${result.text.length} chars`],
  ];

  return (
    <section className={css.panel}>
      <h3 className={css.panelTitle}>The file</h3>
      <dl className={css.facts}>
        {facts.map(([k, v]) => (
          <div key={k} className={css.factRow}>
            <dt className={css.factKey}>{k}</dt>
            <dd className={css.factVal}>{v}</dd>
          </div>
        ))}
      </dl>
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
        "Finds", not "recovers". Nothing was repaired, the file was read, and
        these are the values a parser comes away with. Much smaller claim, and
        the only one that is true.
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
            −{score.deductions.reduce((n, d) => n + d.cost, 0)} total
          </span>
        ) : null}
      </h3>

      {score.deductions.length ? (
        <ul className={css.findingList}>
          {score.deductions.map((d) => (
            <li key={d.label} className={css.finding}>
              <span className={css.findingCost}>−{d.cost}</span>
              <span className={css.findingKind}>{d.label}</span>
              <span className={css.findingBody}>{d.detail}</span>
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
 * What to do about it: fix it, or save it as something else.
 *
 * Both routes go through the same conversion, so a file opened in the editor
 * and a file exported straight from here contain the same document.
 */
function ActionsPanel({ name, result }: { name: string; result: Extraction }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openInEditor = useCallback(async () => {
    setBusy("editor");
    setError(null);
    try {
      const { toResume } = await import("@/extract/toResume");
      const resume = toResume(result, name);
      if (!stageHandoff(resume)) {
        throw new Error(
          "This browser will not hold the document between pages. Export it instead.",
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
      try {
        const [{ toResume }, { download }] = await Promise.all([
          import("@/extract/toResume"),
          import("@/export"),
        ]);
        await download(toResume(result, name), format);
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

      <div className={css.actions}>
        <button
          type="button"
          className={css.actionPrimary}
          onClick={openInEditor}
          disabled={empty || busy !== null}
        >
          {busy === "editor" ? "Opening…" : "Fix it in the editor"}
        </button>

        {empty ? (
          <p className={css.actionNote}>
            There is no text to carry over. Export the original as a PDF with a
            text layer and try again.
          </p>
        ) : null}

        <div className={css.actionSaves}>
          <span className={css.actionLabel}>Save a copy as</span>
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.ext}
              type="button"
              className={css.actionGhost}
              onClick={() => save(f)}
              disabled={empty || busy !== null}
              title={f.note}
            >
              {busy === f.ext ? "…" : f.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className={css.actionNote} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
