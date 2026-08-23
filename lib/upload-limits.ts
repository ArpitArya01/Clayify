/**
 * Upload constraints, shared by the browser form and the route handler.
 *
 * 20MB matches the PicX asset limit for images, so a file that passes here will
 * not be rejected by the upload call for being too large.
 */

export const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function isAcceptedType(type: string): boolean {
  return (ACCEPTED_TYPES as readonly string[]).includes(type);
}

/**
 * Check a chosen file before anything touches the network.
 *
 * Returns a message to show, or `null` when the file is fine. Shared so the
 * file picker, the camera input and the drop target cannot disagree about what
 * a valid photo is. The server checks again — the client is only fast feedback.
 */
export function describeFileProblem(file: File): string | null {
  if (!isAcceptedType(file.type)) {
    return "That file type is not supported. Use a JPG, PNG or WEBP image.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "That image is larger than 20MB. Try a smaller file.";
  }
  if (file.size === 0) {
    return "That file is empty.";
  }
  return null;
}
