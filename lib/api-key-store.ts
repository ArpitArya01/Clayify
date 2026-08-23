/**
 * Browser-side storage for a visitor's own PicX API key.
 *
 * `localStorage`, so the key survives a reload and a closed tab. That is the
 * right trade for a tool nobody signs into: the alternative is retyping a 69
 * character key on every visit. Nothing else about the key is relaxed — it is
 * sent to this app's own route handler and never used to call PicX from the
 * browser, which would put it in network traces the page itself can read back.
 *
 * "Forget" clears it, and the settings sheet says where it lives.
 */

const STORAGE_KEY = "clayify.picx-key";
const KEY_PREFIX = "pxsk_";

/**
 * Subscription plumbing so components can read this through
 * `useSyncExternalStore` instead of copying it into state inside an effect.
 */
const listeners = new Set<() => void>();

export function subscribeToKey(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function looksLikeKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX) && value.length > KEY_PREFIX.length + 8;
}

export function getStoredKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && value.trim() ? value.trim() : null;
  } catch {
    // Storage can be blocked entirely in private modes.
    return null;
  }
}

export function setStoredKey(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value.trim());
  } catch {
    // Nothing useful to do — the caller shows its own error.
  }
  notify();
}

export function clearStoredKey(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
  notify();
}

/** Server snapshot for `useSyncExternalStore`: no storage exists there. */
export function getServerKeySnapshot(): string | null {
  return null;
}

/** `pxsk_1234…cbc2` — enough to recognise a key without revealing it. */
export function maskKey(value: string): string {
  if (value.length <= 14) return `${KEY_PREFIX}…`;
  return `${value.slice(0, 9)}…${value.slice(-4)}`;
}
