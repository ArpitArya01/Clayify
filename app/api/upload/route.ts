import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PicXPermissionError } from "picx-ai";
import { getPicX } from "@/lib/picx";
import {
  badRequest,
  looksLikeRequestKey,
  readRequestKey,
  respondToPicXError,
} from "@/lib/picx-errors";
import { isFallbackEnabled, uploadToPublicHost } from "@/lib/public-upload";
import { isAcceptedType, MAX_FILE_SIZE } from "@/lib/upload-limits";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/upload
 *
 * Turns an uploaded file into a public URL, because `images.edit` reads URLs and
 * not bytes. Split out from the generation route so it can run the moment a
 * photo is chosen: by the time Generate is pressed the URL already exists, and a
 * key that cannot upload fails here rather than after a 20 second wait.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Could not read the upload. Please try again.");
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) return badRequest("No image was provided.");
  if (!isAcceptedType(file.type)) {
    return badRequest("Only JPG, PNG and WEBP images are supported.");
  }
  if (file.size === 0) return badRequest("That file is empty.");
  if (file.size > MAX_FILE_SIZE) {
    return badRequest("That image is larger than 20MB. Try a smaller file.");
  }

  const requestKey = readRequestKey(request);
  if (requestKey && !looksLikeRequestKey(requestKey)) {
    return badRequest("That does not look like a PicX API key.");
  }

  const filename = asString(form.get("filename")) ?? "photo.jpg";

  try {
    const picx = getPicX(requestKey);
    const asset = await picx.assets.create(
      { file, filename },
      { signal: request.signal, idempotencyKey: randomUUID() },
    );
    return NextResponse.json({ url: asset.url, id: asset.id });
  } catch (error) {
    // Demo escape hatch: only for a key that cannot upload, and only when
    // explicitly switched on. See lib/public-upload.ts for the privacy cost.
    if (error instanceof PicXPermissionError && isFallbackEnabled()) {
      console.warn(
        "[upload] PicX rejected the upload (key cannot upload files). " +
          "Falling back to a public file host — the photo is leaving our control.",
      );
      try {
        const url = await uploadToPublicHost(file, filename);
        return NextResponse.json({ url, id: null, fallback: true });
      } catch (fallbackError) {
        console.error("[upload] fallback host failed:", fallbackError);
      }
    }

    return respondToPicXError(error, { visitorKey: Boolean(requestKey), scope: "upload" });
  }
}

function asString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
