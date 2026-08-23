"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { ConverterPanel, ResultActions, type ViewTab } from "./converter-panel";
import { ResultGallery } from "./result-gallery";
import { UploadPanel } from "./upload-panel";
import { getStoredKey } from "@/lib/api-key-store";
import { DEFAULT_CLAY_STYLE, type ClayStyleId } from "@/lib/clay-prompts";
import { addToGallery } from "@/lib/gallery-store";
import { requestKeyDialog } from "@/lib/key-dialog";
import { describeFileProblem } from "@/lib/upload-limits";

type Phase = "idle" | "working" | "done";
type Stage = "uploading" | "sculpting";
export type UploadState = "idle" | "uploading" | "ready" | "error";

/**
 * Progress during the edit is an estimate. `images.edit` is one synchronous call
 * that reports nothing until it returns — measured runs are 19 to 27 seconds. The
 * bar eases toward a ceiling and only snaps to 100% when the response lands, so
 * it can never claim to be finished early.
 */
const TICK_MS = 200;
const PROGRESS_CEILING = 92;
const PROGRESS_EASE = 0.03;

function keyHeader(): Record<string, string> | undefined {
  // Read at request time rather than holding the key in state, so it stays out
  // of the component tree. A header keeps it out of body logging.
  const key = getStoredKey();
  return key ? { "x-picx-key": key } : undefined;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

type ClayStudioProps = {
  /**
   * Whether the server carries its own `PICX_API_KEY`. Only the fact that one
   * exists crosses to the browser, never the key. Without this the local
   * convenience path would be blocked by the "add a key" prompt below.
   */
  serverKeyConfigured?: boolean;
};

export function ClayStudio({ serverKeyConfigured = false }: ClayStudioProps) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [styleId, setStyleId] = useState<ClayStyleId>(DEFAULT_CLAY_STYLE);

  const [tab, setTab] = useState<ViewTab>("photo");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<Stage>("sculpting");
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * The hosted source URL. Held in a ref as well as being the thing Generate
   * reads, so an upload that finishes while other state is changing cannot be
   * read stale.
   */
  const assetUrlRef = useRef<string | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);

  const stopTicking = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      stopTicking();
      uploadAbortRef.current?.abort();
      generateAbortRef.current?.abort();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [stopTicking],
  );

  /** Upload the file and remember the URL it becomes. */
  const uploadFile = useCallback(async (file: File, signal: AbortSignal): Promise<string> => {
    const body = new FormData();
    body.set("file", file);
    body.set("filename", file.name);

    const response = await fetch("/api/upload", {
      method: "POST",
      body,
      headers: keyHeader(),
      signal,
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Could not upload that photo."));
    }

    const payload = (await response.json()) as { url?: string };
    if (!payload.url) throw new Error("The upload did not return a URL.");

    assetUrlRef.current = payload.url;
    return payload.url;
  }, []);

  /**
   * Uploading starts the moment a photo is chosen rather than waiting for
   * Generate. By the time the visitor presses the button the URL usually exists,
   * and a key that cannot upload fails here instead of after a 20 second wait.
   */
  const beginUpload = useCallback(
    (file: File) => {
      uploadAbortRef.current?.abort();
      const controller = new AbortController();
      uploadAbortRef.current = controller;

      setUploadState("uploading");
      setUploadError(null);

      void uploadFile(file, controller.signal)
        .then(() => {
          if (controller.signal.aborted) return;
          setUploadState("ready");
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setUploadState("error");
          setUploadError(caught instanceof Error ? caught.message : "Could not upload that photo.");
        })
        .finally(() => {
          if (uploadAbortRef.current === controller) uploadAbortRef.current = null;
        });
    },
    [uploadFile],
  );

  const startTicking = useCallback(() => {
    stopTicking();
    progressRef.current = 0;
    setProgress(0);
    tickRef.current = setInterval(() => {
      const next = progressRef.current + (PROGRESS_CEILING - progressRef.current) * PROGRESS_EASE;
      progressRef.current = next;
      setProgress(Math.round(next));
    }, TICK_MS);
  }, [stopTicking]);

  function clearOutput() {
    generateAbortRef.current?.abort();
    stopTicking();
    setPhase("idle");
    setProgress(0);
    progressRef.current = 0;
    setResultUrl(null);
    setError(null);
    // Nothing to look at on the result tab once it is cleared.
    setTab("photo");
  }

  function handleFileSelected(file: File) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const preview = URL.createObjectURL(file);
    objectUrlRef.current = preview;

    clearOutput();
    assetUrlRef.current = null;
    setSourceFile(file);
    setSourceUrl(preview);
    beginUpload(file);
  }

  /** Every route into the app — picker, camera, drop — comes through here. */
  function chooseFile(file: File | undefined) {
    if (!file) return;

    const problem = describeFileProblem(file);
    if (problem) {
      setFileError(problem);
      return;
    }

    setFileError(null);
    handleFileSelected(file);
  }

  function handleStyleChange(next: ClayStyleId) {
    setStyleId(next);
    // A different style means a different image, so the old result no longer
    // matches what the controls say.
    if (resultUrl || error) clearOutput();
  }

  function retryUpload() {
    if (sourceFile) beginUpload(sourceFile);
  }

  /** Put a saved result back in the viewer, where it can be downloaded again. */
  function handlePickSaved(url: string) {
    if (phase === "working") return;
    setError(null);
    setResultUrl(url);
    setTab("result");
  }

  function onDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (isBusy) return;
    setIsDragging(true);
  }

  function onDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    // Moving between children of the stage is not leaving it.
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setIsDragging(false);
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (isBusy) return;
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function handleGenerate() {
    // Nothing can be generated without a key, so ask for one rather than firing
    // a request that can only come back as an error.
    if (!serverKeyConfigured && !getStoredKey()) {
      requestKeyDialog();
      return;
    }

    generateAbortRef.current?.abort();
    const controller = new AbortController();
    generateAbortRef.current = controller;

    setError(null);
    setPhase("working");

    try {
      let assetUrl = assetUrlRef.current;

      // Normally the upload already finished. This covers the case where it
      // failed and the visitor has since fixed their key.
      if (!assetUrl) {
        if (!sourceFile) throw new Error("Choose a photo first.");
        setStage("uploading");
        startTicking();
        setUploadState("uploading");
        setUploadError(null);
        assetUrl = await uploadFile(sourceFile, controller.signal);
        setUploadState("ready");
      }

      setStage("sculpting");
      if (!tickRef.current) startTicking();

      const body = new FormData();
      body.set("style", styleId);
      body.set("assetUrl", assetUrl);

      const response = await fetch("/api/clay", {
        method: "POST",
        body,
        headers: keyHeader(),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Something went wrong. Please try again."));
      }

      const payload = (await response.json()) as { url?: string };
      if (!payload.url) throw new Error("The conversion did not return an image.");

      stopTicking();
      progressRef.current = 100;
      setProgress(100);
      setResultUrl(payload.url);
      setPhase("done");
      // The thing they asked for now exists, so show it.
      setTab("result");
      // Kept on this device only, so a result survives a reload or a Reset.
      addToGallery(payload.url, styleId);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      stopTicking();
      setPhase("idle");
      setProgress(0);
      progressRef.current = 0;
      const message = caught instanceof Error ? caught.message : "Something went wrong.";
      setError(message);
      setTab("result");
      if (!assetUrlRef.current && sourceFile) {
        setUploadState("error");
        setUploadError(message);
      }
    } finally {
      if (generateAbortRef.current === controller) generateAbortRef.current = null;
    }
  }

  function handleReset() {
    uploadAbortRef.current?.abort();
    generateAbortRef.current?.abort();
    stopTicking();
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    assetUrlRef.current = null;
    setSourceUrl(null);
    setSourceFile(null);
    setFileError(null);
    setUploadState("idle");
    setUploadError(null);
    setStyleId(DEFAULT_CLAY_STYLE);
    setTab("photo");
    setPhase("idle");
    setProgress(0);
    progressRef.current = 0;
    setResultUrl(null);
    setError(null);
  }

  const isBusy = phase === "working";
  const hasSource = Boolean(sourceFile);

  return (
    <section
      className={isDragging ? "stage drag" : "stage"}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <ConverterPanel
        tab={tab}
        onTabChange={setTab}
        sourceUrl={sourceUrl}
        resultUrl={resultUrl}
        isBusy={isBusy}
        stage={stage}
        progress={progress}
        error={error}
      />

      <UploadPanel
        styleId={styleId}
        onStyleChange={handleStyleChange}
        onChooseFile={chooseFile}
        fileName={sourceFile?.name ?? null}
        uploadState={uploadState}
        uploadError={uploadError}
        fileError={fileError}
        onRetryUpload={retryUpload}
        onGenerate={() => void handleGenerate()}
        canGenerate={hasSource && uploadState !== "uploading" && !isBusy}
        hasResult={Boolean(resultUrl)}
        isBusy={isBusy}
      />

      <ResultActions resultUrl={resultUrl} onReset={handleReset} />

      <ResultGallery onPick={handlePickSaved} activeUrl={resultUrl} />
    </section>
  );
}
