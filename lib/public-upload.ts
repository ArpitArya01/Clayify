/**
 * Temporary stand-in for PicX managed uploads.
 *
 * `images.edit` will only read a public URL, and the PicX upload endpoint
 * (`POST /assets`) is gated behind the `uploads:write` scope. When the
 * configured key lacks that scope there is no way to hand PicX a local file, so
 * this uploads the image to a public host and returns the resulting URL instead.
 *
 * PRIVACY: the uploaded photo leaves our control. It lands on a third-party
 * public file host at an unguessable but unauthenticated URL, and it is not
 * automatically deleted. This is a demo workaround, not a shipping design —
 * grant the key `uploads:write` and this path stops being used.
 *
 * Enabled only when CLAY_UPLOAD_FALLBACK=catbox is set, so it can never kick in
 * by accident.
 */

const CATBOX_ENDPOINT = "https://catbox.moe/user/api.php";
const UPLOAD_TIMEOUT_MS = 60_000;

export function isFallbackEnabled(): boolean {
  return process.env.CLAY_UPLOAD_FALLBACK === "catbox";
}

/** Host the fallback serves from, so regeneration can accept the URL back. */
export const FALLBACK_HOST = "files.catbox.moe";

export async function uploadToPublicHost(file: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", file, filename);

  const response = await fetch(CATBOX_ENDPOINT, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });

  const text = (await response.text()).trim();

  if (!response.ok) {
    throw new Error(`Fallback upload failed with status ${response.status}: ${text.slice(0, 200)}`);
  }

  // The endpoint answers with the bare URL on success and a plain error string
  // on failure, so the response has to be validated rather than trusted.
  if (!text.startsWith("https://") || text.includes(" ")) {
    throw new Error(`Fallback upload returned an unexpected body: ${text.slice(0, 200)}`);
  }

  return text;
}
