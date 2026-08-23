"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  clearStoredKey,
  getServerKeySnapshot,
  getStoredKey,
  looksLikeKey,
  maskKey,
  setStoredKey,
  subscribeToKey,
} from "@/lib/api-key-store";
import { subscribeToKeyDialogRequests } from "@/lib/key-dialog";

export function SettingsButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // localStorage is an external store, so it is read through
  // useSyncExternalStore rather than copied into state inside an effect. The
  // server snapshot is null, which also avoids a hydration mismatch.
  const savedKey = useSyncExternalStore(subscribeToKey, getStoredKey, getServerKeySnapshot);

  const open = useCallback(() => {
    setDraft("");
    setError(null);
    // `showModal` throws if the dialog is already open.
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }, []);

  /**
   * Generate opens this sheet when there is no key, so the visitor is asked for
   * one instead of watching a request fail.
   */
  useEffect(() => subscribeToKeyDialogRequests(open), [open]);

  function close() {
    dialogRef.current?.close();
  }

  /**
   * Saved as it is typed rather than behind a button. There is one field and one
   * possible action, so a button would only be a step to forget.
   */
  function onKeyInput(value: string) {
    setDraft(value);
    const trimmed = value.trim();

    if (!trimmed) {
      setError(null);
      return;
    }
    if (!looksLikeKey(trimmed)) {
      // Shown but not blocking — the visitor is probably mid-paste.
      setError("PicX keys start with pxsk_.");
      return;
    }

    setError(null);
    setStoredKey(trimmed);
  }

  function forget() {
    clearStoredKey();
    setDraft("");
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        className={savedKey ? "gear active" : "gear"}
        aria-label="API key settings"
        title="API key settings"
        onClick={open}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19a1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>

      <dialog ref={dialogRef} className="sheet" onClose={() => setDraft("")}>
        <form method="dialog" onSubmit={(event) => event.preventDefault()}>
          <div className="sheet-head">
            <h2>PicX API key</h2>
            <button type="button" className="sheet-close" aria-label="Close" onClick={close}>
              ✕
            </button>
          </div>

          <p className="sheet-copy">
            Clayify calls the PicX API with your own key. Nothing is generated without one.
          </p>

          {savedKey ? (
            <p className="sheet-status">
              <span>✓ Key saved — {maskKey(savedKey)}</span>
              <button type="button" className="link-btn" onClick={forget}>
                Forget
              </button>
            </p>
          ) : null}

          <label className="sheet-label" htmlFor="picx-key">
            {savedKey ? "Replace key" : "PicX API key"}
          </label>
          <input
            id="picx-key"
            className="sheet-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="pxsk_…"
            value={draft}
            onChange={(event) => onKeyInput(event.target.value)}
          />

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          <p className="sheet-note">
            <a
              className="sheet-link"
              href="https://ai.picxstudio.com/api"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get a free key at PicX AI ↗
            </a>
          </p>

          <p className="sheet-note">
            Enable <strong>Upload files</strong> (<code>uploads:write</code>) and{" "}
            <code>images:edit</code> when you create the key. Both are needed to convert a photo.
          </p>
          <p className="sheet-note">
            The key is stored in this browser only. It is sent to Clayify&rsquo;s own server to make
            the PicX call and is never stored there. It is never used to call PicX directly from the
            browser.
          </p>
        </form>
      </dialog>
    </>
  );
}
