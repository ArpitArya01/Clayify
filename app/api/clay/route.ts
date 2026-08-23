import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { DEFAULT_CLAY_STYLE, findClayStyle } from "@/lib/clay-prompts";
import { getPicX } from "@/lib/picx";
import {
  badRequest,
  looksLikeRequestKey,
  readRequestKey,
  respondToPicXError,
} from "@/lib/picx-errors";
import { FALLBACK_HOST, isFallbackEnabled } from "@/lib/public-upload";

export const runtime = "nodejs";

/**
 * Image generation is synchronous and can run for tens of seconds. Only hosts
 * that read this honour it; locally the dev server has no limit.
 */
export const maxDuration = 300;

/**
 * Output size is fixed here rather than accepted from the request, so a crafted
 * call cannot ask for 4K and inflate the cost of a generation. Same for `model`,
 * which is left to the server default.
 */
const OUTPUT_SIZE = "1K" as const;

/**
 * Hosts whose URLs may be passed to `images.edit`.
 *
 * The source URL arrives from the client, so without this check the endpoint
 * would happily spend a key editing any URL a caller invented.
 *
 * The fallback host is only allowed while the fallback is actually switched on.
 * Listing it unconditionally widened the allowlist for every deployment,
 * including ones that never upload there — and with a server-side
 * `PICX_API_KEY` configured that let a crafted request spend our key editing
 * any image someone had parked on that public host.
 */
function allowedAssetHosts(): string[] {
  return isFallbackEnabled() ? ["picxstudio.com", FALLBACK_HOST] : ["picxstudio.com"];
}

/**
 * POST /api/clay
 *
 * Applies a clay style to an already-hosted image. Uploading happens in
 * `/api/upload`, which runs when the photo is chosen.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Could not read the request. Please try again.");
  }

  const style = findClayStyle(asString(form.get("style")) ?? DEFAULT_CLAY_STYLE);
  if (!style) return badRequest("Unknown clay style.");

  const assetUrl = asString(form.get("assetUrl"));
  if (!assetUrl) return badRequest("No image was provided.");
  if (!isAllowedAssetUrl(assetUrl)) {
    return badRequest("That image URL is not one we can convert.");
  }

  const requestKey = readRequestKey(request);
  if (requestKey && !looksLikeRequestKey(requestKey)) {
    return badRequest("That does not look like a PicX API key.");
  }

  try {
    const picx = getPicX(requestKey);

    const image = await picx.images.edit(
      {
        instruction: style.instruction,
        image_urls: [assetUrl],
        size: OUTPUT_SIZE,
      },
      {
        // Cancelling the browser request cancels the upstream generation too,
        // rather than paying for a result nobody will see.
        signal: request.signal,
        // A fresh key per call: a regenerate is meant to produce a new image, so
        // it must not be deduplicated against the previous one.
        idempotencyKey: randomUUID(),
        // Retrying an edit is not useful. The API dedupes on the idempotency key
        // and answers a replay with `503 Idempotent image edit is still
        // processing`, burning ~14s before failing anyway. Failing fast and
        // letting the visitor press Regenerate is the better trade.
        maxRetries: 0,
      },
    );

    return NextResponse.json({ url: image.url });
  } catch (error) {
    return respondToPicXError(error, { visitorKey: Boolean(requestKey), scope: "clay" });
  }
}

function asString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isAllowedAssetUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return allowedAssetHosts().some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
  );
}
