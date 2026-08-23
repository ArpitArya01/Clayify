"use client";

import { useRef } from "react";
import { CameraSheet } from "./camera-sheet";
import { UploadIcon } from "./icons";
import type { UploadState } from "./clay-studio";
import { CLAY_STYLES, type ClayStyleId } from "@/lib/clay-prompts";
import { ACCEPTED_TYPES } from "@/lib/upload-limits";

type UploadPanelProps = {
  styleId: ClayStyleId;
  onStyleChange: (id: ClayStyleId) => void;
  onChooseFile: (file: File | undefined) => void;
  fileName: string | null;
  uploadState: UploadState;
  uploadError: string | null;
  fileError: string | null;
  onRetryUpload: () => void;
  onGenerate: () => void;
  canGenerate: boolean;
  hasResult: boolean;
  isBusy: boolean;
};

export function UploadPanel({
  styleId,
  onStyleChange,
  onChooseFile,
  fileName,
  uploadState,
  uploadError,
  fileError,
  onRetryUpload,
  onGenerate,
  canGenerate,
  hasResult,
  isBusy,
}: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleInput(input: HTMLInputElement) {
    const file = input.files?.[0];
    // Clear the native value so picking the same file again still fires change.
    input.value = "";
    onChooseFile(file);
  }

  return (
    <>
      <div className="pills" role="group" aria-label="Clay style">
        {CLAY_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            className={style.id === styleId ? "pill selected" : "pill"}
            aria-pressed={style.id === styleId}
            disabled={isBusy}
            onClick={() => onStyleChange(style.id)}
          >
            {style.label}
          </button>
        ))}
      </div>

      <div className="controls">
        <div className="row">
          <button
            type="button"
            className="btn btn-outline"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon />
            {fileName ? "Change" : "Upload"}
          </button>
          <CameraSheet onCapture={onChooseFile} disabled={isBusy} />
        </div>

        {/* Generation is never automatic. It costs credits, so it waits for a
            deliberate press. */}
        <button
          type="button"
          className="btn btn-solid cta"
          disabled={!canGenerate}
          onClick={onGenerate}
        >
          {isBusy ? "Sculpting…" : hasResult ? "Generate Again" : "Generate Clay Art"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          hidden
          onChange={(event) => handleInput(event.currentTarget)}
        />

        <StatusLine
          fileName={fileName}
          fileError={fileError}
          uploadState={uploadState}
          uploadError={uploadError}
          onRetryUpload={onRetryUpload}
          isBusy={isBusy}
          canGenerate={canGenerate}
        />
      </div>
    </>
  );
}

type StatusLineProps = {
  fileName: string | null;
  fileError: string | null;
  uploadState: UploadState;
  uploadError: string | null;
  onRetryUpload: () => void;
  isBusy: boolean;
  canGenerate: boolean;
};

/**
 * One line, one message. The photo is hosted as soon as it is chosen, so the
 * outcome of that belongs here rather than surfacing during generation.
 */
function StatusLine({
  fileName,
  fileError,
  uploadState,
  uploadError,
  onRetryUpload,
  isBusy,
  canGenerate,
}: StatusLineProps) {
  if (fileError) {
    return (
      <p className="status err" role="alert">
        {fileError}
      </p>
    );
  }

  if (uploadState === "error" && uploadError) {
    return (
      <p className="status err" role="alert">
        {uploadError}{" "}
        <button type="button" className="link-btn" onClick={onRetryUpload}>
          Try again
        </button>
      </p>
    );
  }

  if (uploadState === "uploading") {
    return (
      <p className="status" role="status">
        <span className="dot-loader" aria-hidden="true" />
        Uploading photo…
      </p>
    );
  }

  if (uploadState === "ready" && fileName) {
    return (
      <p className="status ok" role="status">
        ✓ {fileName} ready
      </p>
    );
  }

  if (!canGenerate && !isBusy) {
    return <p className="status">Add a photo to get started.</p>;
  }

  return null;
}
