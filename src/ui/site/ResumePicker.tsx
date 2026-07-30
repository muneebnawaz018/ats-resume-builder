"use client";

import { useCallback, useId, useRef, useState } from "react";
import {
  ACCEPT_ATTR,
  classify,
  depthNote,
  extname,
  formatBytes,
  type ResumeFormat,
} from "@/lib";
import css from "@/ui/site/site.module.css";

type Picked = { file: File; format: ResumeFormat };

/**
 * File selection for the checker: click, keyboard, or drop.
 *
 * Which files are allowed and why lives in @/lib/formats, not here, the
 * extractor needs the same answer, and two copies of that list would drift.
 */
export function ResumePicker({
  onFile,
  onClear,
}: {
  onFile?: (picked: Picked) => void;
  /** Fired when the chosen file is removed, so a report can be torn down. */
  onClear?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const errorId = useId();

  const accept = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const result = classify(file);
      if (!result.ok) {
        setPicked(null);
        setError(result.reason);
        return;
      }
      const next = { file, format: result.format };
      setError(null);
      setPicked(next);
      onFile?.(next);
    },
    [onFile],
  );

  const clear = useCallback(() => {
    setPicked(null);
    setError(null);
    // The input keeps its value, so re-picking the same file fires no change
    // event and the second attempt looks like a dead control.
    if (input.current) input.current.value = "";
    input.current?.focus();
    onClear?.();
  }, [onClear]);

  const zone = [
    css.pickerZone,
    over && css.pickerZoneOver,
    error && css.pickerZoneBad,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={css.pickerCard}>
      <p className={css.pickerLabel}>Choose a resume</p>

      <div
        className={zone}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          accept(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={input}
          id={`${errorId}-input`}
          className={css.pickerInput}
          type="file"
          accept={ACCEPT_ATTR}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => accept(e.target.files?.[0])}
        />

        {picked ? (
          <div className={css.pickerFile}>
            <span className={css.pickerFileIcon} aria-hidden="true">
              {extname(picked.file.name).slice(1).toUpperCase()}
            </span>
            <span className={css.pickerFileText}>
              <span className={css.pickerFileName}>{picked.file.name}</span>
              <span className={css.pickerFileMeta}>
                {picked.format.label} · {formatBytes(picked.file.size)}
              </span>
            </span>
            <button type="button" className={css.pickerClear} onClick={clear}>
              Remove
            </button>
          </div>
        ) : (
          <label
            className={css.pickerPrompt}
            htmlFor={`${errorId}-input`}
            aria-label="Choose a resume file"
          >
            <span className={css.pickerIcon} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className={css.pickerPromptText}>
              <strong>Drop a file here</strong> or click to browse
            </span>
            <span className={css.pickerHint}>
              PDF, Word, OpenDocument, rich text or plain text, up to 10 MB
            </span>
          </label>
        )}
      </div>

      {error ? (
        <p className={css.pickerError} id={errorId} role="alert">
          {error}
        </p>
      ) : picked ? (
        // What the report can cover depends on the format, and saying so up
        // front beats a clean score on checks the file could never fail.
        <p className={css.pickerNote}>{depthNote(picked.format.depth)}</p>
      ) : (
        <p className={css.pickerNote}>
          The file stays in this tab. Nothing is uploaded.
        </p>
      )}
    </div>
  );
}
