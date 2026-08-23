import { NextResponse } from "next/server";
import {
  PicXAbortError,
  PicXAuthenticationError,
  PicXError,
  PicXGenerationFailedError,
  PicXInsufficientCreditsError,
  PicXPermissionError,
  PicXRateLimitError,
  PicXTimeoutError,
  PicXValidationError,
} from "picx-ai";
import { MissingApiKeyError } from "./picx";

/**
 * Shared error mapping for both PicX-backed routes.
 *
 * How much detail is safe to return depends on whose key failed. When the
 * visitor supplied it, a key or scope problem is *theirs* to fix, so saying so
 * plainly is the helpful thing. When the server supplied it, the same message
 * would leak our configuration, so it stays vague.
 */
export function respondToPicXError(
  error: unknown,
  { visitorKey, scope }: { visitorKey: boolean; scope: string },
) {
  // Expected whenever someone opens the app before setting a key, so it is not
  // worth a stack trace.
  if (error instanceof MissingApiKeyError) {
    return fail(400, "Add your PicX API key using the settings button in the header.");
  }

  // The SDK redacts the key from messages, bodies and headers, so logging the
  // error verbatim cannot leak it.
  if (error instanceof PicXError) {
    console.error(
      `[${scope}] PicX ${error.constructor.name} status=${error.status ?? "-"} ` +
        `code=${error.code ?? "-"} requestId=${error.requestId ?? "-"}: ${error.message}`,
    );
  } else {
    console.error(`[${scope}] unexpected error:`, error);
  }

  if (error instanceof PicXAbortError) {
    // The browser went away. Nothing to report to a listener that is gone.
    return new NextResponse(null, { status: 499 });
  }

  if (error instanceof PicXAuthenticationError) {
    return fail(
      401,
      visitorKey
        ? "That API key was rejected. Check it in settings."
        : "The clay service is not configured correctly.",
    );
  }

  if (error instanceof PicXPermissionError) {
    if (!visitorKey) return fail(500, "The clay service is not configured correctly.");

    // The scope name in the API's message is not what the key-creation screen
    // calls it, so name both.
    if (error.message.includes("uploads:write")) {
      return fail(
        403,
        "This key cannot upload files. Create a new key with Upload files enabled (the uploads:write scope).",
      );
    }
    return fail(403, "This key is missing a scope it needs. Check images:edit is enabled.");
  }

  if (error instanceof PicXInsufficientCreditsError) {
    return fail(
      402,
      visitorKey
        ? "This key has no credits left."
        : "The clay service is temporarily unavailable. Please try again later.",
    );
  }

  if (error instanceof PicXRateLimitError) {
    const retryAfter = error.retryAfter;
    return fail(
      429,
      retryAfter
        ? `Too many requests. Try again in about ${retryAfter} seconds.`
        : "Too many requests. Please wait a moment and try again.",
      retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
    );
  }

  if (error instanceof PicXValidationError) {
    return fail(400, "This image could not be processed. Try a different photo.");
  }

  if (error instanceof PicXTimeoutError) {
    return fail(504, "That took too long. Please try again.");
  }

  if (error instanceof PicXGenerationFailedError) {
    return fail(502, "The clay conversion failed. Please try again.");
  }

  if (error instanceof PicXError) {
    return fail(502, "The clay service returned an error. Please try again.");
  }

  return fail(500, "Something went wrong. Please try again.");
}

/** Reads and shape-checks the visitor's key from the request headers. */
export function readRequestKey(request: Request): string | undefined {
  return request.headers.get("x-picx-key")?.trim() || undefined;
}

export function looksLikeRequestKey(key: string): boolean {
  return key.startsWith("pxsk_");
}

export function fail(status: number, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

export function badRequest(message: string) {
  return fail(400, message);
}
