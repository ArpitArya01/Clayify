"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraIcon, SwitchCameraIcon } from "./icons";

type Facing = "user" | "environment";

type CameraSheetProps = {
  /** Handed the captured frame as a JPEG file, same as the picker would. */
  onCapture: (file: File) => void;
  disabled?: boolean;
};

function describeCameraError(caught: unknown): string {
  if (caught instanceof DOMException) {
    if (caught.name === "NotAllowedError") {
      return "Camera access was blocked. Allow the camera for this site, then try again.";
    }
    if (caught.name === "NotFoundError") {
      return "No camera was found on this device.";
    }
  }
  return "Could not start the camera. You can upload a photo instead.";
}

/**
 * A live viewfinder with a shutter, feeding the normal upload path.
 *
 * A plain `capture` file input hands the whole job to the OS camera app, which
 * on a desktop is just the file picker again. This takes the frame in the page,
 * so "Camera" means the same thing everywhere. Where `getUserMedia` does not
 * exist at all — older in-app webviews — it falls back to that captured input.
 */
export function CameraSheet({ onCapture, disabled = false }: CameraSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<Facing>("user");
  const [canSwitch, setCanSwitch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Cleanup only. A stream left running keeps the camera light on.
  useEffect(() => () => stopStream(), [stopStream]);

  const startStream = useCallback(
    async (next: Facing) => {
      stopStream();
      setError(null);
      setIsLive(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: next },
          audio: false,
        });
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          // The sheet closed while permission was pending.
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          return;
        }

        video.srcObject = stream;
        // Autoplay can reject while the dialog is still animating in. The
        // stream is attached either way, so this is not worth reporting.
        await video.play().catch(() => {});
        setIsLive(true);
      } catch (caught) {
        setError(describeCameraError(caught));
      }
    },
    [stopStream],
  );

  async function detectSwitching() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCanSwitch(devices.filter((device) => device.kind === "videoinput").length > 1);
    } catch {
      setCanSwitch(false);
    }
  }

  function open() {
    if (!navigator.mediaDevices?.getUserMedia) {
      fallbackInputRef.current?.click();
      return;
    }

    setError(null);
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    void detectSwitching();
    void startStream(facing);
  }

  function close() {
    dialogRef.current?.close();
  }

  function switchCamera() {
    const next: Facing = facing === "user" ? "environment" : "user";
    setFacing(next);
    void startStream(next);
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;

    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const context = canvas.getContext("2d");
    if (!context) return;

    // The front camera preview is mirrored so it reads like a mirror. Flip it
    // back here, so the saved frame matches what was actually in front of it.
    if (facing === "user") {
      context.translate(videoWidth, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, videoWidth, videoHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not read that frame. Try again.");
          return;
        }
        const file = new File([blob], `clayify-camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        close();
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <>
      <button type="button" className="btn btn-outline" disabled={disabled} onClick={open}>
        <CameraIcon />
        Camera
      </button>

      {/* Kept for browsers with no MediaDevices API at all. */}
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onCapture(file);
        }}
      />

      <dialog
        ref={dialogRef}
        className="camera-sheet"
        aria-label="Take a photo"
        // Covers Escape and the close button alike, so the camera can never be
        // left running behind a closed sheet.
        onClose={() => {
          stopStream();
          setIsLive(false);
        }}
      >
        <div className="camera-stage">
          <video
            ref={videoRef}
            className={facing === "user" ? "camera-video mirrored" : "camera-video"}
            autoPlay
            playsInline
            muted
          />

          {error ? (
            <p className="camera-error" role="alert">
              {error}
            </p>
          ) : !isLive ? (
            <p className="camera-error" role="status">
              Starting the camera…
            </p>
          ) : null}

          <button
            type="button"
            className="camera-close"
            aria-label="Close the camera"
            onClick={close}
          >
            ✕
          </button>
        </div>

        <div className="camera-controls">
          {canSwitch ? (
            <button
              type="button"
              className="camera-switch"
              aria-label="Switch camera"
              onClick={switchCamera}
            >
              <SwitchCameraIcon />
            </button>
          ) : (
            <span className="camera-spacer" aria-hidden="true" />
          )}

          <button
            type="button"
            className="camera-shutter"
            aria-label="Take photo"
            disabled={!isLive}
            onClick={capture}
          />

          <span className="camera-spacer" aria-hidden="true" />
        </div>
      </dialog>
    </>
  );
}
