"use client";

import { useEffect, useState } from "react";
import type { Picked } from "./Dropzone";
import { PanelHead } from "./ReportPanels";
import css from "./console.module.css";

type Saved = { id: string; name: string; updatedAt: string };

/** Short and absolute. "3 days ago" reads as vaguer than it is. */
function edited(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Checks a resume built here, by exporting it and reading the export back.
 *
 * What the editor stores is structured data, never a document, so handing it
 * straight to the extractor would measure nothing: none of the failures this
 * page looks for, a missing text layer, a layout table, two columns read in
 * the wrong order, can exist in a database record. It would score full marks
 * every time and mean nothing by it.
 *
 * So the document is built first, as the Word file someone would actually
 * send, and that file is what gets read. The round trip is the measurement,
 * and it is the same path an upload takes from there on.
 */
export function SavedList({ onPick }: { onPick: (picked: Picked) => void }) {
  const [saved, setSaved] = useState<Saved[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /*
   * Read straight from the database rather than mounting the editor's store.
   * This route is static and deliberately carries no state layer; pulling the
   * store in for a list of names would undo that.
   */
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const { db, isDbAvailable } = await import("@/store/db");
        if (!isDbAvailable()) {
          if (live) setSaved([]);
          return;
        }
        const { tryLoadResume } = await import("@/schema");
        const rows = await db.allResumes();
        const list = rows
          .map((raw) => tryLoadResume(raw))
          .filter((r) => r.ok)
          .map((r) => ({
            id: r.resume.id,
            name: r.resume.name || r.resume.basics.fullName || "Untitled",
            updatedAt: r.resume.updatedAt,
          }))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        if (live) setSaved(list);
      } catch {
        // Private browsing or a blocked store. The dropzone still works.
        if (live) setSaved([]);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const check = async (row: Saved) => {
    setBusy(row.id);
    setError(null);
    try {
      const [{ db }, { tryLoadResume }, { toBlob, EXPORT_FORMATS }] =
        await Promise.all([
          import("@/store/db"),
          import("@/schema"),
          import("@/export"),
        ]);
      const raw = (await db.allResumes()).find(
        (r) => (r as { id?: string }).id === row.id,
      );
      const loaded = raw ? tryLoadResume(raw) : null;
      if (!loaded?.ok) {
        setError("That document could not be read back.");
        return;
      }
      const format = EXPORT_FORMATS.find((f) => f.ext === ".docx");
      if (!format) return;
      const blob = await toBlob(loaded.resume, format);
      const file = new File([blob], `${row.name}.docx`, { type: format.mime });
      const { classify } = await import("@/lib");
      const result = classify(file);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      onPick({ file, format: result.format });
    } catch {
      setError("That document could not be exported for checking.");
    } finally {
      setBusy(null);
    }
  };

  /**
   * Deletes one document from this browser.
   *
   * Behind a confirm because there is nowhere to undo it from: the checker
   * holds no history, and this is the only copy unless the person exported
   * one. The editor is unaffected by a document disappearing, it falls back
   * to the most recently edited one when the id it stored no longer resolves.
   */
  const remove = async (row: Saved) => {
    setConfirming(null);
    setError(null);
    try {
      const { db } = await import("@/store/db");
      await db.deleteResume(row.id);
      setSaved((list) => (list ?? []).filter((r) => r.id !== row.id));
    } catch {
      setError("That document could not be deleted.");
    }
  };

  // Nothing saved yet, and nothing to say about it: the dropzone is the whole
  // story for a first-time visitor.
  if (!saved || saved.length === 0) return null;

  return (
    <section className={css.panel}>
      <PanelHead count={String(saved.length)}>
        Or check one you have built
      </PanelHead>

      <ul className={css.savedList}>
        {saved.map((row) => (
          <li key={row.id} className={css.savedRow}>
            <button
              type="button"
              className={css.savedItem}
              disabled={busy !== null}
              onClick={() => void check(row)}
            >
              <span className={css.savedName}>{row.name}</span>
              {/* Checking one file twice stores two documents, so several rows
                  can carry the same name. The date tells them apart. */}
              <span className={css.savedWhen}>{edited(row.updatedAt)}</span>
              <span className={css.savedAction}>
                {busy === row.id ? "Building…" : "Check as Word"}
              </span>
            </button>

            {confirming === row.id ? (
              <span className={css.savedConfirm}>
                <button
                  type="button"
                  className={css.savedDanger}
                  onClick={() => void remove(row)}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className={css.btn}
                  onClick={() => setConfirming(null)}
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                className={css.savedRemove}
                aria-label={`Delete ${row.name}`}
                title="Delete from this browser"
                onClick={() => setConfirming(row.id)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className={css.note}>
        Each one is exported to Word first and the export is what gets read, so
        the result describes the file you would send rather than the data behind
        it.
      </p>

      {error ? (
        <p className={css.failed} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
