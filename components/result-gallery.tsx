"use client";

import { useSyncExternalStore } from "react";
import { findClayStyle } from "@/lib/clay-prompts";
import {
  getGallerySnapshot,
  getServerGallerySnapshot,
  removeFromGallery,
  subscribeToGallery,
} from "@/lib/gallery-store";

type ResultGalleryProps = {
  /** Load a saved result back into the viewer. */
  onPick: (url: string) => void;
  activeUrl: string | null;
};

/**
 * Everything generated on this device, newest first.
 *
 * localStorage is an external store, so it is read through
 * `useSyncExternalStore` rather than copied into state inside an effect. The
 * server snapshot is empty, which also avoids a hydration mismatch.
 */
export function ResultGallery({ onPick, activeUrl }: ResultGalleryProps) {
  const items = useSyncExternalStore(
    subscribeToGallery,
    getGallerySnapshot,
    getServerGallerySnapshot,
  );

  if (!items.length) return null;

  return (
    <div className="shelf">
      <p className="shelf-title">Made on this device</p>
      <div className="shelf-strip">
        {items.map((item) => {
          const label = findClayStyle(item.style)?.label ?? "Clay art";

          return (
            <div
              key={item.id}
              className={item.url === activeUrl ? "shelf-item current" : "shelf-item"}
            >
              <button
                type="button"
                className="shelf-open"
                title={label}
                aria-label={`View ${label}`}
                onClick={() => onPick(item.url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={label} loading="lazy" />
              </button>
              <button
                type="button"
                className="shelf-remove"
                aria-label={`Remove ${label} from this device`}
                onClick={() => removeFromGallery(item.id)}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
