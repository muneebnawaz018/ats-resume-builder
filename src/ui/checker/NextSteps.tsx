"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { stageHandoff } from "@/lib";
import type { Extraction } from "@/extract";
import { EXPORT_FORMATS, type ExportFormat } from "@/export";
import { PanelHead } from "./ReportPanels";
import css from "./console.module.css";

/**
 * What to do about it: convert it, or fix it.
 *
 * Two panels, not one split down the middle. They are two different decisions:
 * take the file somewhere else, or keep working on it here. Converting comes
 * first because it is the wide one: five formats need a full row.
 *
 * The download buttons name the extension and carry an arrow, then say what was
 * written. Labelled "Word" and "Markdown" under "Save a copy as" they read as a
 * format switch, and the file arriving in the downloads folder was a surprise.
 */
export function NextSteps({
  name,
  result,
}: {
  name: string;
  result: Extraction;
}) {
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
    /*
     * One panel, two decisions, side by side.
     *
     * They were two stacked cards, which read as two unrelated steps and left
     * a band of empty panel beside each one. They are the same question asked
     * twice: take this document somewhere else, or keep working on it here. A
     * hairline between the columns is enough to separate them.
     *
     * Keep working comes first, and is the filled button: everything above
     * this panel is a list of things to fix, and the editor is where fixing
     * happens. Converting is the second answer, so it gets the wider half and
     * quieter controls.
     */
    <section className={css.panel}>
      <PanelHead>What now</PanelHead>

      <div className={css.nextRow}>
        <div className={css.nextCol}>
          <p className={css.subHead}>Fix it</p>
          <button
            type="button"
            className={css.btnPrimary}
            onClick={openInEditor}
            disabled={empty || busy !== null}
          >
            {busy === "editor" ? "Opening…" : "Fix it in the editor"}
          </button>
          <p className={css.note}>
            Opens what was read above as an editable document. Nothing is sent
            anywhere.
          </p>
        </div>

        <div className={css.nextCol}>
          <p className={css.subHead}>Convert it</p>
          <div className={css.saves}>
            {EXPORT_FORMATS.map((f) => (
              <button
                key={f.ext}
                type="button"
                className={css.btn}
                onClick={() => save(f)}
                disabled={empty || busy !== null}
                title={f.note}
              >
                <DownloadIcon />
                {busy === f.ext ? "Saving…" : `${f.label} (${f.ext})`}
              </button>
            ))}
          </div>
          <p className={css.note}>
            Rebuilt from the extracted text, so what a parser reads is what you
            send. Each writes a file straight to your downloads.
          </p>
        </div>
      </div>

      {saved ? (
        <p className={css.saved} role="status">
          Saved {saved} to your downloads.
        </p>
      ) : null}

      {empty ? (
        <p className={css.note}>
          There is no text to carry over. Export the original as a PDF with a
          text layer and try again.
        </p>
      ) : null}

      {error ? (
        <p className={css.failed} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v11m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
