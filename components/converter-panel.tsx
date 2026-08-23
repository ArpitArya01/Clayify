"use client";

import { useState } from "react";
import { DownloadIcon, ResetIcon, ShareIcon } from "./icons";

export type ViewTab = "photo" | "result";

type ConverterPanelProps = {
  tab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  sourceUrl: string | null;
  resultUrl: string | null;
  isBusy: boolean;
  stage: "uploading" | "sculpting";
  progress: number;
  error: string | null;
};

/**
 * The viewer: two tabs over one frame, plus the progress overlay.
 *
 * Both tabs show a real image — the photo as chosen, and the result exactly as
 * the model returned it. Nothing here alters either one.
 */
export function ConverterPanel({
  tab,
  onTabChange,
  sourceUrl,
  resultUrl,
  isBusy,
  stage,
  progress,
  error,
}: ConverterPanelProps) {
  const canSeeResult = Boolean(resultUrl) || Boolean(error);

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Preview">
        <button
          type="button"
          role="tab"
          id="tab-photo"
          className="tab"
          aria-selected={tab === "photo"}
          aria-controls="stage-view"
          onClick={() => onTabChange("photo")}
        >
          Photo
        </button>
        <button
          type="button"
          role="tab"
          id="tab-result"
          className="tab"
          aria-selected={tab === "result"}
          aria-controls="stage-view"
          disabled={!canSeeResult}
          onClick={() => onTabChange("result")}
        >
          Clay result
        </button>
      </div>

      <div
        className="view"
        id="stage-view"
        role="tabpanel"
        aria-labelledby={tab === "photo" ? "tab-photo" : "tab-result"}
      >
        {tab === "photo" ? (
          sourceUrl ? (
            // The key remounts the element when the photo or the tab changes,
            // which is what replays the reveal animation.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`photo-${sourceUrl}`} src={sourceUrl} alt="Your photo" />
          ) : (
            <div className="empty">
              <div>
                <strong>Add a photo to start</strong>
                Upload one, use the camera, or drag a photo in here.
              </div>
            </div>
          )
        ) : resultUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`result-${resultUrl}`} src={resultUrl} alt="Clay-style version of your photo" />
        ) : error ? (
          <div className="empty failed">
            <div>
              <strong>That didn&rsquo;t work</strong>
              {error}
            </div>
          </div>
        ) : (
          <div className="empty">
            <div>
              <strong>Ready when you are</strong>
              Your clay creation will show up here.
            </div>
          </div>
        )}

        {isBusy ? (
          <div className="progress-overlay" aria-live="polite">
            <div className="progress-row">
              <div className="progress-label">
                <span className="mini-loader" aria-hidden="true" />
                <span>{stage === "uploading" ? "Uploading photo…" : "Sculpting clay…"}</span>
              </div>
              <strong>{progress}%</strong>
            </div>

            <div
              className="bar"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Clay conversion progress"
            >
              <div className="fill" style={{ width: `${progress}%` }} />
            </div>

            {stage === "sculpting" ? (
              <p className="progress-note">Usually around 20 seconds. This is an estimate.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

type ResultActionsProps = {
  resultUrl: string | null;
  onReset: () => void;
};

/** Everything that acts on a finished result. */
export function ResultActions({ resultUrl, onReset }: ResultActionsProps) {
  const [notice, setNotice] = useState<string | null>(null);

  async function downloadResult() {
    if (!resultUrl) return;
    setNotice(null);

    // The result lives on another origin, where `<a download>` is ignored and
    // the browser just navigates. Fetching the bytes first keeps it a download.
    try {
      const response = await fetch(resultUrl);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = "clay-art.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch {
      // Blocked by CORS or offline — opening the image is still better than nothing.
      window.open(resultUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function shareResult() {
    if (!resultUrl) return;
    setNotice(null);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My Clay Art", text: "Made with Clayify", url: resultUrl });
        return;
      } catch {
        // The share sheet was dismissed. Nothing to report.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(resultUrl);
      setNotice("Link copied to clipboard.");
    } catch {
      setNotice("Sharing is not available in this browser.");
    }
  }

  return (
    <>
      <div className="actions">
        <button
          type="button"
          className="action"
          disabled={!resultUrl}
          onClick={() => void downloadResult()}
        >
          <DownloadIcon />
          Download
        </button>
        <button
          type="button"
          className="action"
          disabled={!resultUrl}
          onClick={() => void shareResult()}
        >
          <ShareIcon />
          Share
        </button>
        <button
          type="button"
          className="action"
          onClick={() => {
            setNotice(null);
            onReset();
          }}
        >
          <ResetIcon />
          Reset
        </button>
      </div>

      {notice ? (
        <p className="status" role="status">
          {notice}
        </p>
      ) : null}
    </>
  );
}
