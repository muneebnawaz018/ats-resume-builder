"use client";

import { useCallback, useId, useRef, useState } from "react";
import {
  ACCEPT_ATTR,
  classify,
  extname,
  formatBytes,
  type ResumeFormat,
} from "@/lib";
import css from "./console.module.css";

export type Picked = { file: File; format: ResumeFormat };

/**
 * File selection: click, keyboard, or drop.
 *
 * Which formats are allowed lives in @/lib/formats, not here. The extractor
 * needs the same answer and two copies of that list would drift.
 */
export function Dropzone({ onFile }: { onFile: (picked: Picked) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const id = useId();

  const accept = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const result = classify(file);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setError(null);
      onFile({ file, format: result.format });
    },
    [onFile],
  );

  const zone = [css.zone, over && css.zoneOver, error && css.zoneBad]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
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
          id={`${id}-input`}
          className={css.input}
          type="file"
          accept={ACCEPT_ATTR}
          aria-label="Choose a resume file"
          aria-describedby={error ? id : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => accept(e.target.files?.[0])}
        />

        <span className={css.prompt}>
          <span className={css.promptIcon} aria-hidden="true">
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
          <span className={css.promptText}>
            <strong>Drop your resume here</strong> or click to choose a file
          </span>
          <span className={css.promptHint}>
            PDF · DOCX · ODT · RTF · TXT · up to 10 MB
          </span>
        </span>
      </div>

      {error ? (
        <p className={css.zoneError} id={id} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * What replaces the dropzone once a file has been read.
 *
 * A bar, not a card: the choice is settled, and the only thing still on offer
 * is undoing it. The report below is what deserves the room.
 */
export function FileBar({
  picked,
  onClear,
}: {
  picked: Picked;
  onClear: () => void;
}) {
  return (
    <div className={css.fileBar}>
      <span className={css.fileExt} aria-hidden="true">
        {extname(picked.file.name).slice(1).toUpperCase()}
      </span>
      <span className={css.fileText}>
        <span className={css.fileName}>{picked.file.name}</span>
        <span className={css.fileMeta}>
          {picked.format.label} · {formatBytes(picked.file.size)}
        </span>
      </span>
      <button type="button" className={`${css.btn} ${css.fileClear}`} onClick={onClear}>
        Check another
      </button>
    </div>
  );
}
