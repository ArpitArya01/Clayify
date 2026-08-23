# Tasks — Clay Conversion

Ordered backend-first. The risk was concentrated in the API integration — key,
scopes, prompt quality, timing — while the UI rewrite was predictable. Verifying
the route in isolation before touching a single component meant that when the
scope problem surfaced, it surfaced on its own, with no UI changes to untangle
from it.

References point at sections of `requirements.md`.

## 1. Setup

- [x] 1.1 Add `.env.local` and a committed `.env.example` documenting every variable
- [x] 1.2 `npm install picx-ai@0.2.1` with an exact pin
- [x] 1.3 Confirm the installed package ships `dist/` and `.d.ts`

## 2. Server foundations

- [x] 2.1 `lib/picx.ts` — lazy client, 180s timeout, `window` guard so the module cannot be used from client code
  - _Requirements: Protecting keys_
- [x] 2.2 `lib/clay-prompts.ts` — four presets with a shared identity clause
  - _Requirements: Style selection_
- [x] 2.3 `lib/upload-limits.ts` — size and MIME constants somewhere both the browser and the server can import
  - _Requirements: Validation_

## 3. The conversion route

At this point one route did both steps. Section 10 splits it.

- [x] 3.1 `app/api/clay/route.ts` — read FormData, validate type, size, empty file, style id
  - _Requirements: Validation, Style selection_
- [x] 3.2 Two-step pipeline: `assets.create` then `images.edit`
  - _Requirements: Hosting the source_
- [x] 3.3 Fix `size` server-side; never read it from the request
  - _Requirements: Controlling cost_
- [x] 3.4 Fresh `idempotencyKey` per call
  - _Requirements: Controlling cost_
- [x] 3.5 Host allowlist for any client-supplied source URL
  - _Requirements: Controlling cost_
- [x] 3.6 Forward `request.signal` into the SDK
  - _Requirements: Failure and recovery_
- [x] 3.7 Map every typed SDK error to a plain message
  - _Requirements: Failure and recovery_

## 4. Verify the route alone, before any UI work

- [x] 4.1 POST a real photo with curl and read the outcome
- [x] 4.2 **Found: the key is missing the upload scope.** Confirmed against the API directly, bypassing the app
- [x] 4.3 Confirm `images:edit` *is* granted — an invalid payload returns 422, not 403, so the scope check passes
- [x] 4.4 Prove the pipeline end to end using a public URL, which needs no upload — 200 in 17.8s
- [x] 4.5 Inspect the returned image. Real clay, subject recognisable
  - _Requirements: Real transformation_
- [x] 4.6 **Found: edit retries waste ~14s.** 503 replays answer "Idempotent image edit is still processing". Set `maxRetries: 0`
- [x] 4.7 Test the error paths: bad host, unknown style, no file — all 400
  - _Requirements: Failure and recovery_

## 5. Client state

- [x] 5.1 `components/clay-studio.tsx` — replace the fake `setInterval` with a real fetch
- [x] 5.2 Split the source URL from the result URL
  - _Requirements: Real transformation — one field is what let the prototype fake the conversion_
- [x] 5.3 `AbortController` in a ref; reset and re-generate abort the in-flight call
  - _Requirements: Failure and recovery_
- [x] 5.4 Estimated progress: eased ramp to a 92% ceiling, snap to 100% on arrival
  - _Requirements: Progress_
- [x] 5.5 Object URL previews, revoked on change and unmount
  - _Requirements: Ways in_

## 6. Client UI

- [x] 6.1 `upload-panel.tsx` — remove auto-convert, add an explicit Generate button
  - _Requirements: Explicit generation_
- [x] 6.2 Four style chips, prompt never exposed
  - _Requirements: Style selection_
- [x] 6.3 `converter-panel.tsx` — render the real result, delete `.clay-filter`
  - _Requirements: Real transformation_
- [x] 6.4 Regenerate without re-uploading the source
  - _Requirements: Using the result_
- [x] 6.5 Blob-based download, since `<a download>` is ignored cross-origin
  - _Requirements: Using the result_
- [x] 6.6 Styles for chips and the secondary button, across all four breakpoints
- [x] 6.7 Remove the "Private & secure" footer claim — photos are uploaded to a CDN, so it was false

## 7. Fixes found by testing

- [x] 7.1 **Stop-motion produced no clay.** The prompt led with "a frame from a stop-motion film" and mentioned film grain, so the model applied a photo grade. Rewrote it material-first and re-tested
  - _Requirements: Real transformation_
- [x] 7.2 **Sample photos were converting a 300px thumbnail.** Split each sample into a picker thumbnail and a full-size URL. Superseded by section 13, which removed samples entirely

## 8. Unblock uploads

- [x] 8.1 Rule out a `data:` URL — 422, URLs capped at 2048 characters
- [x] 8.2 Rule out other upload endpoints — `/uploads`, `/files`, `/media`, `/images/upload`, `/upload` all 404
- [x] 8.3 Check the admin CLI — no key or scope commands, and not authenticated
- [x] 8.4 `lib/public-upload.ts` — public-host fallback, off unless explicitly enabled
- [x] 8.5 Log the privacy consequence, and document it in `.env.example`
- [x] 8.6 Verify an uploaded photo end to end through the fallback — 200 in 25.2s

## 9. Verification

- [x] 9.1 `npx tsc --noEmit` clean
- [x] 9.2 `eslint .` clean
- [x] 9.3 `npm run build` clean
- [x] 9.4 All four styles generated and inspected by eye

## 10. Bring your own key

Adopted after seeing the same shape work elsewhere: carry no server-side key at
all, and upload on selection rather than on generate.

- [x] 10.1 Gear button and settings sheet; key saved as it is typed
  - _Requirements: Visitor-supplied keys_
- [x] 10.2 Read the key through `useSyncExternalStore` rather than copying it into state in an effect
  - _the lint rule pushed this to the correct pattern for an external store_
- [x] 10.3 `getPicX(requestKey)` builds a per-request client and never caches a visitor key
  - _Requirements: Visitor-supplied keys — a cached key would be used for another visitor's request_
- [x] 10.4 Send the key in an `x-picx-key` header, read from storage at request time
  - _Requirements: Protecting keys_
- [x] 10.5 Stop requiring a server-side key; support one but leave it unset
  - _Requirements: Visitor-supplied keys_
- [x] 10.6 Split uploading into `app/api/upload/route.ts`, running on photo selection
  - _Requirements: Hosting the source_
- [x] 10.7 Share error mapping in `lib/picx-errors.ts`, with a flag deciding how much to reveal
  - _Requirements: Failure and recovery_
- [x] 10.8 Name the scope the way the key-creation screen does: **Upload files**
  - _Requirements: Failure and recovery_
- [x] 10.9 Drop the process-level 403 memo, which became wrong once keys were per visitor
  - _one visitor's missing scope would have routed another's photo to the fallback_
- [x] 10.10 Report upload state in the status line, with a retry
  - _Requirements: Hosting the source_
- [x] 10.11 Pass only `serverKeyConfigured`, a boolean, from `app/page.tsx` to the client
  - _Requirements: Protecting keys_
- [x] 10.12 Open the key sheet from Generate when no key is set, via `lib/key-dialog.ts`
  - _Requirements: Visitor-supplied keys — the header and the button have no client ancestor to share state through_
- [x] 10.13 Show a saved key masked, and offer Forget
  - _Requirements: Visitor-supplied keys_
- [x] 10.14 Verified: no key → actionable 400; key without Upload files → 403 naming the scope

## 11. Camera capture

A `capture` file input hands the whole job to the OS camera app, which on a
desktop is the file picker again. "Camera" should mean the same thing everywhere.

- [x] 11.1 `components/camera-sheet.tsx` — `getUserMedia` viewfinder in a dialog, with a shutter
  - _Requirements: Camera_
- [x] 11.2 Capture to a canvas, then to a JPEG `File`
  - _Requirements: Camera_
- [x] 11.3 Mirror the front preview, un-mirror the captured frame
  - _Requirements: Camera — the preview should read like a mirror, the photo should not_
- [x] 11.4 Front/back switch, shown only when more than one camera exists
  - _Requirements: Camera_
- [x] 11.5 Name the reason when permission is denied or no camera exists, and leave Upload working
  - _Requirements: Camera_
- [x] 11.6 Stop the stream from `onClose`, so Escape and the close button are both covered
  - _Requirements: Camera — a stream left running keeps the camera light on_
- [x] 11.7 Fall back to the `capture` input where `getUserMedia` is absent
  - _Requirements: Camera — it needs a secure context, so plain HTTP over a LAN address has no stream_
- [x] 11.8 Route the captured frame through `chooseFile` so it cannot skip validation
  - _Requirements: Ways in_

## 12. The device shelf

- [x] 12.1 `lib/gallery-store.ts` — `localStorage`, newest first, capped at 24
  - _Requirements: Remembering results_
- [x] 12.2 Store result URLs, not bytes
  - _Requirements: Remembering results — a generation already returns a hosted link, so this is hundreds of bytes instead of megabytes of base64_
- [x] 12.3 Cache the snapshot and return a frozen shared empty array
  - _`useSyncExternalStore` compares by reference, so parsing JSON on every read loops forever_
- [x] 12.4 `components/result-gallery.tsx` — the strip, with tap-to-restore and a remove button
  - _Requirements: Remembering results_
- [x] 12.5 Survive a reload and a Reset; drop malformed entries on read
  - _Requirements: Remembering results_
- [x] 12.6 Drop the drag-and-drop target onto the stage, sharing `chooseFile`
  - _Requirements: Ways in_

## 13. Drop the samples

Samples existed because the original key lacked **Upload files**: they were
already public URLs, so they converted without an upload. Once every visitor
brings their own key with that scope, they were scaffolding holding up a problem
that no longer existed.

- [x] 13.1 Remove the sample picker, the sample URLs and the `sampleUrl` state
  - _a second source path meant two ways for the viewer to be populated and an extra host on the allowlist_
- [x] 13.2 Simplify the two progress stages to follow the request actually in flight
  - _Requirements: Progress — the stages were previously "one of these is skipped for a sample"_
- [x] 13.3 Let the shelf carry the demo instead, since it fills up with real output
  - _Requirements: Remembering results_

## 14. Security review before open-sourcing

A full pass over the repository for key leakage, ahead of publishing.

- [x] 14.1 Confirm no secret is committed: `.env` variants, `pxsk_` patterns, AWS/GitHub/Slack/PEM formats, npm auth tokens, `.npmrc`
- [x] 14.2 Generic high-entropy token scan across every committable file, to catch a secret in a format nobody thought to look for — zero hits
- [x] 14.3 Confirm the built client bundle contains no `PICX_API_KEY`, no `new PicX(`, and none of `lib/picx.ts` or `lib/public-upload.ts`
  - _Requirements: Protecting keys — checked against the build output rather than inferred from the imports_
- [x] 14.4 Audit every `console.*` call; confirm none touches a key, header or body
  - _Requirements: Protecting keys_
- [x] 14.5 Confirm no key ever enters a URL or query string, and that the saved key reaches the DOM only through `maskKey()`
  - _Requirements: Protecting keys_
- [x] 14.6 **Found: the allowlist trusted the fallback host unconditionally.** Made it conditional on `CLAY_UPLOAD_FALLBACK`, so a deployment that never uploads there does not trust it
  - _Requirements: Controlling cost — with a server-side key configured, this let a crafted request edit anything parked on that public host_
- [x] 14.7 **Found: docs claimed the key was session-scoped.** It is `localStorage` and persists. Corrected the comment and the README
- [x] 14.8 **Found: the README invited a live key to be pasted into a committed file.** Replaced with a bring-your-own-key note
- [x] 14.9 Validate stored shelf URLs as `https:` on read, since they become `<img src>` and a `window.open` target
  - _Requirements: Remembering results_
- [x] 14.10 Re-run `npm run build` and `eslint .`, and re-scan the rebuilt bundle — clean

## 15. Keep the spec honest

- [x] 15.1 Rewrite `design.md`, which still described one route, samples, and a 403 memo that task 10.9 had removed
- [x] 15.2 Remove samples from `requirements.md`; add Camera, Ways in and Remembering results
- [x] 15.3 Correct the error-mapping table, which predated visitor keys and listed auth failures as 500
- [x] 15.4 Fix the steering pointer at a remount-by-key pattern in `UploadPanel` that no longer exists
- [x] 15.5 Update the allowlist rule in `picx-integration.md` to match 14.6

## 16. Still open

- [ ] 16.1 Decide a licence and add a `LICENSE` file. `package.json` says `UNLICENSED` and the README says the same, which is the honest default — but it also means nobody who clones the repo may legally use it. Publishing without one is a choice, not an oversight, so make it deliberately
- [ ] 16.2 Add rate limiting before any public deployment — the routes are an open proxy to PicX. Per-visitor keys mean there is no shared balance to drain, but that is not the same as being safe to expose
- [ ] 16.3 Confirm the PicX managed-asset path end to end with a key that has **Upload files** enabled, and record the timing. Not yet verified in this repo
- [ ] 16.4 Sniff magic bytes on upload rather than trusting the client's `file.type`. Low exposure while the fallback is off, since PicX validates the bytes itself
- [ ] 16.5 Send `Cache-Control: no-store` on both routes. Responses vary by `x-picx-key` and nothing caches a POST by default, so this is insurance against a misconfigured proxy rather than a live bug
- [ ] 16.6 Note in the README that anyone deploying this for other people is handling their keys, and must not log request headers
- [ ] 16.7 Scope the CSS before merging this into another application
- [ ] 16.8 Check whether `images.edit` accepts `aspect_ratio`. The SDK types omit it, but the API may still honour it; if it does, a ratio control becomes possible
