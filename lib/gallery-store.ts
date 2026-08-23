/**
 * Browser-side record of clay art generated on this device.
 *
 * What is stored is the result URL, not the image bytes. A generation returns a
 * PicX-hosted URL, so keeping the link costs a few hundred bytes instead of
 * megabytes of base64 and stays well inside the localStorage quota. The
 * consequence is that these are links: if PicX stops serving one, the thumbnail
 * breaks and the visitor can remove it.
 *
 * Nothing here reaches the server. There is no account and no sync — clearing
 * site data clears the shelf.
 */

const STORAGE_KEY = "clayify.gallery";

/** Enough to be useful, small enough that the strip stays a strip. */
const LIMIT = 24;

export type GalleryItem = {
  id: string;
  url: string;
  /** The style id it was generated with, for the thumbnail's label. */
  style: string;
  createdAt: number;
};

/**
 * A frozen shared empty array. `useSyncExternalStore` compares snapshots by
 * reference, so returning a fresh `[]` on every read would loop forever.
 */
const EMPTY: readonly GalleryItem[] = Object.freeze([]);

let cache: readonly GalleryItem[] | null = null;

const listeners = new Set<() => void>();

export function subscribeToGallery(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener();
}

function isItem(value: unknown): value is GalleryItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.url === "string" &&
    isHttpsUrl(item.url) &&
    typeof item.style === "string" &&
    typeof item.createdAt === "number"
  );
}

/**
 * These URLs are read back out of storage and handed to `<img src>` and, on the
 * download fallback, to `window.open`. Anything that is not plain https is
 * dropped, so a `javascript:` entry written into storage by other means cannot
 * become a click target.
 */
function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function read(): readonly GalleryItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const items = parsed.filter(isItem);
    return items.length ? Object.freeze(items) : EMPTY;
  } catch {
    // Storage blocked, or something else wrote nonsense under this key.
    return EMPTY;
  }
}

function write(items: readonly GalleryItem[]): void {
  cache = items.length ? Object.freeze([...items]) : EMPTY;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Private mode or quota. The shelf stays correct for this session only.
  }
  notify();
}

export function getGallerySnapshot(): readonly GalleryItem[] {
  if (typeof window === "undefined") return EMPTY;
  if (!cache) cache = read();
  return cache;
}

/** Server snapshot: no storage exists there, so the shelf starts empty. */
export function getServerGallerySnapshot(): readonly GalleryItem[] {
  return EMPTY;
}

/** Newest first, capped, and never the same URL twice. */
export function addToGallery(url: string, style: string): void {
  if (typeof window === "undefined") return;

  const current = getGallerySnapshot().filter((item) => item.url !== url);
  const item: GalleryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url,
    style,
    createdAt: Date.now(),
  };

  write([item, ...current].slice(0, LIMIT));
}

export function removeFromGallery(id: string): void {
  if (typeof window === "undefined") return;
  write(getGallerySnapshot().filter((item) => item.id !== id));
}
