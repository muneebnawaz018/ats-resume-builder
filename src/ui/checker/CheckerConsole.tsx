"use client";

import { useCallback, useState } from "react";
import {
  extract,
  recoverFields,
  scoreExtraction,
  type Extraction,
} from "@/extract";
import { Dropzone, FileBar, type Picked } from "./Dropzone";
import { MatchPanel } from "./MatchPanel";
import { NextSteps } from "./NextSteps";
import { Blockers, Fields, FileFacts, Findings } from "./ReportPanels";
import { SavedList } from "./SavedList";
import { ScoreDial } from "./ScoreDial";
import css from "./console.module.css";

/**
 * Pick a file, read it, score it, then get on with it.
 *
 * The page is one column of instruments. Before a file exists the dropzone is
 * the whole page, because choosing one is the only action available; after
 * that it collapses to a bar and the readout takes the room.
 *
 * The order is the order the questions get asked: can this file be submitted
 * at all, how well does it read, what came out of it, what is wrong, does it
 * match the posting, what now.
 */
type State =
  | { phase: "idle" }
  | { phase: "reading"; name: string }
  | { phase: "done"; picked: Picked; result: Extraction }
  | { phase: "failed"; message: string };

export function CheckerConsole() {
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
          error instanceof Error
            ? error.message
            : "That file could not be read.",
      });
    }
  }, []);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  if (state.phase === "done") {
    const fields = recoverFields(state.result);
    const score = scoreExtraction(
      state.result,
      fields,
      state.picked.file.size,
      state.picked.format.ext,
    );

    return (
      <>
        <FileBar picked={state.picked} onClear={reset} />

        <div className={css.report}>
          <Blockers blockers={score.blockers} />

          {/* The verdict beside its evidence. A score alone invites the
              question this row answers on the same line. */}
          <div className={css.readout}>
            <ScoreDial score={score} />
            <Fields fields={fields} />
          </div>

          <Findings score={score} result={state.result} />

          <div className={css.split}>
            <FileFacts picked={state.picked} result={state.result} />
            <MatchPanel resumeText={state.result.text} />
          </div>

          <NextSteps name={state.picked.file.name} result={state.result} />
        </div>
      </>
    );
  }

  return (
    <>
      <Dropzone onFile={run} />

      {state.phase === "reading" ? (
        <p className={css.status} role="status">
          <span className={css.spinner} aria-hidden="true" />
          Reading {state.name}…
        </p>
      ) : null}

      {state.phase === "failed" ? (
        <p className={css.failed} role="alert">
          {state.message}
        </p>
      ) : null}

      {/* Only offered before a report exists; afterwards the page is the
          report, and a second way in would compete with reading it. */}
      {state.phase === "idle" ? (
        <div className={css.report}>
          <SavedList onPick={run} />
        </div>
      ) : null}
    </>
  );
}
