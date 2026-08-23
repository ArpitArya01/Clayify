import { PicX } from "picx-ai";

/**
 * Server-only PicX client.
 *
 * The API key must never reach the browser, so this module is only ever
 * imported from route handlers. `server-only` is not installed, so the guard
 * below is the runtime backstop: if this file ever ends up in a client bundle,
 * it fails loudly instead of silently shipping a key.
 */

/**
 * Per-attempt timeout. Image endpoints are synchronous and can take tens of
 * seconds, and the SDK docs say to raise this rather than lower it. The default
 * is 120s; 180s leaves headroom for a slow model without hanging forever.
 */
const TIMEOUT_MS = 180_000;

let client: PicX | null = null;

/** Thrown when neither the visitor nor the server supplied a key. */
export class MissingApiKeyError extends Error {
  constructor() {
    super("No PicX API key available.");
    this.name = "MissingApiKeyError";
  }
}

/**
 * @param requestKey A key the visitor supplied for this request only. It takes
 * precedence over the server's own key and is **never cached** — caching it
 * would leak one visitor's key into another visitor's request.
 */
export function getPicX(requestKey?: string): PicX {
  if (typeof window !== "undefined") {
    throw new Error("lib/picx.ts is server-only — it must not be imported from client code.");
  }

  if (requestKey) {
    return new PicX({ apiKey: requestKey, timeout: TIMEOUT_MS });
  }

  if (client) return client;

  const apiKey = process.env.PICX_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();

  client = new PicX({ apiKey, timeout: TIMEOUT_MS });
  return client;
}
