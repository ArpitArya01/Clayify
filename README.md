# Clayify

Clayify turns a photograph into clay art. Upload a photo, pick one of four clay styles, press one button, and get back the same subject rendered as a sculpted clay figure.

Built with [Kiro](https://kiro.dev) for the Ready, Spec, Ship hackathon.

Demo video: _add link before submitting_

## The problem

Clay-style portraits are everywhere, but making one is not easy. You need sculpting skill, or an artist, or a working knowledge of image-generation prompts.

Most tools advertised as "clay filters" are colour filters. They tint the photo and leave the geometry untouched, so the result still looks like a photograph with a warm grade on it. The subject was never rebuilt as clay.

## The solution

Clayify does the real transformation. The subject's shapes are rebuilt as clay volumes with visible fingerprint texture and matte studio lighting, while the pose, expression and framing stay recognisable. It calls an image-editing model through the PicX API with a prompt tuned for each style.

The user writes no prompt and makes no technical decisions. Model, output size, aspect ratio and prompt are all fixed server-side.

This mattered enough to become a project rule. The first version of this app used a CSS `filter` to tint the photo. It looked like a feature and was not one, so it was deleted. Any transformation the app shows is produced by the model.

## Key features

- **Four clay styles** — Cute Claymation, Polymer Clay, Stop-motion and Ceramic. Each is a tuned prompt preset, not a filter
- **Three ways to supply a photo** — file picker, drag-and-drop, or an in-page camera with a live viewfinder and a front/back switch
- **Bring your own API key** — paste a PicX key into the gear in the header. No account, no signup, no server-side key
- **Honest progress** — the image API is synchronous and reports nothing until it finishes, so the progress bar is labelled an estimate rather than pretending to measure
- **A shelf that remembers** — results are kept in the browser, newest first, and survive a reload. Nothing is stored server-side
- **Download and share** — saves the real bytes cross-origin, with a native share sheet where available
- **Accessible controls** — `aria-label` on icon-only buttons, `aria-pressed` on toggles, a real `role="progressbar"`, polite live regions, and a `prefers-reduced-motion` block that switches off every animation

## Setup

Requires **Node.js 20 or newer** (the `picx-ai` SDK needs it) and npm 10+.

```bash
git clone <repository-url>
cd Clayify
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Then click the **gear icon** in the header and paste a PicX API key. It saves as you type. No `.env.local` file is needed and nothing needs restarting.

### Getting an API key

1. Create a free account at [ai.picxstudio.com](https://ai.picxstudio.com/)
2. Create an API key
3. Enable **both** of these scopes on it:
   - `images:edit`
   - **Upload files** — the API calls this scope `uploads:write`, but the key-creation screen labels it "Upload files". Look for the label, not the identifier

Both scopes are required. `images.edit` accepts image URLs rather than raw bytes, so the photo has to be hosted before it can be edited, and hosting it needs the upload scope. A key with only `images:edit` will fail the moment you select a photo, with a message naming the scope to enable.

The key is stored in your browser's `localStorage` and sent to Clayify's own route handlers, which make every PicX call. The browser never calls PicX directly.

## Usage

1. **Add a photo** — press Upload, drag a file onto the stage, or press Camera to take one. Uploading starts immediately, so it is done before you press Generate
2. **Pick a style** — one of the four chips
3. **Press Generate Clay Art** — takes roughly 20 seconds
4. **Use the result** — Download saves the image, Share opens the native share sheet or copies the link, Generate Again produces a different take without re-uploading
5. **Come back later** — results stay on the shelf below, on that device

Accepted photos: **JPG, PNG or WEBP, up to 20MB.** Anything else is refused before a request is made.

## Configuration

**No configuration is required.** The intended setup is a browser-supplied key and no environment file at all. Both variables below are optional and unset by default.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PICX_API_KEY` | unset | A server-side key, for local convenience. Leaving it unset is intended: with no shared key, the app cannot spend one person's credits on another person's request. A key supplied in the browser always wins over it |
| `CLAY_UPLOAD_FALLBACK` | unset | Set to `catbox` to route uploads through a public file host when a key lacks **Upload files**. See the warning below |

`.env.example` is committed and documents both with placeholders. Copy it to `.env.local` only if you want the server-side key path. `.env.local` is git-ignored, and environment variables are read once at startup, so changing it requires restarting the dev server.

Never prefix either variable with `NEXT_PUBLIC_`. That inlines the value into the client bundle where anyone can read it.

> **Warning about `CLAY_UPLOAD_FALLBACK`.** With it enabled, the photo is uploaded to a third-party public file host at an unauthenticated URL and is not deleted automatically. It exists only as a demo escape hatch for a key that cannot upload. Leave it unset and fix the key scope instead.

## Costs

**Clayify itself is free and has no paid tier.** All cost is PicX API usage, billed to whichever key is in use — so a judge or contributor using their own key spends only their own credits.

| Action | Cost |
| --- | --- |
| Selecting a photo | One `assets.create` call to host it |
| One generation | One `images.edit` call at **1K output — 35 credits** |
| Generate Again | Another full 35-credit edit. It is a new generation, not a cached one |

Output size is fixed at `1K` server-side and is never read from the request, specifically so that a crafted call cannot ask for 4K and inflate the bill. The model is fixed for the same reason.

Credits are deducted **before** the model runs, so a failed generation can still cost credits. PicX sells credits pay-as-you-go rather than by subscription; check your own [PicX account](https://ai.picxstudio.com/) for your current balance and what a new account is granted, since those figures are set by PicX and not by this project.

The app deliberately does not display credit balances or usage. That is a product decision, not an oversight.

## Rate limits and usage restrictions

**Enforced by this app:**

| Restriction | Value | Why |
| --- | --- | --- |
| File types | JPG, PNG, WEBP | Validated in the browser and again on the server |
| File size | 20MB | Same, both sides |
| Output size | fixed `1K` | Not client-controllable, to cap cost per call |
| Model | fixed | Same reason |
| Source URL hosts | allowlisted | A URL supplied by the client is host-checked before it reaches the model, so a crafted request cannot spend a key editing arbitrary images |
| Retries on edit | none | A 503 replay is answered with "idempotent image edit is still processing", costing about 14 seconds before failing anyway |
| Shelf size | 24 results | Keeps browser storage bounded |
| Request timeout | 180s per attempt | Image endpoints block until the image exists |

**Imposed by PicX:** the API rate-limits requests. When it does, Clayify surfaces the wait using the `Retry-After` value the API returns rather than guessing. Concrete per-minute and per-day limits are set by PicX per account tier and are not published in this repository; consult your PicX account.

**Not implemented:** Clayify has **no rate limiting of its own**. Because every visitor brings their own key there is no shared balance to drain, but the routes would still be an open proxy to the PicX API if deployed publicly. This is why the project is documented to run locally. See [Known limitations](#known-limitations).

## Testing instructions

### Test credentials

**None are required, and none are provided.** There is no login, no account and no signup in Clayify, so there is nothing to hand over. No API key is committed to this repository, deliberately — see the [rules on secrets](#security).

To evaluate the app you will need **your own free PicX API key** with `images:edit` and **Upload files** enabled. See [Getting an API key](#getting-an-api-key). Creating the key is free; generations consume credits from your own account.

### Verifying it works

```bash
npm install
npm run dev
```

Then, at [http://localhost:3000](http://localhost:3000):

1. **No key yet** — press **Generate Clay Art** without adding a key. The key sheet should open rather than a request failing. This is intentional: a request with no key can only come back as an error
2. **Add the key** — gear icon, paste, confirm it shows masked as `pxsk_1234…cbc2`. The raw key is never rendered back into the page
3. **Select a photo** — the preview should appear immediately from a local object URL, and the status line should move to uploading and then to ready, before you press anything
4. **Generate** — pick a style, press Generate. Expect **19 to 27 seconds**. The progress bar climbs to 92% and holds there until the real result lands, then snaps to 100%
5. **Check it is a real conversion** — the result should be rebuilt geometry with clay texture, not the original photo with a colour grade. Compare the Original and Result tabs
6. **Try each style** — the four differ materially, not just in tint
7. **Download** — saves a real file, not a navigation
8. **Generate Again** — produces a *different* image, and does not re-upload the photo
9. **The shelf** — the result appears below. Reload the page: it is still there. Tap it to put it back in the viewer
10. **Camera** — press Camera. On a desktop with a webcam you get an in-page viewfinder. Deny permission instead and it should say so and leave Upload working

### Verifying the failure paths

| Test | Expected |
| --- | --- |
| Paste a malformed key | `401`, "That API key was rejected. Check it in settings." |
| Use a key without **Upload files** | `403` naming both "Upload files" and `uploads:write` |
| Upload a `.txt` renamed to `.png` | Refused, with a readable message |
| Upload a file over 20MB | Refused before any request |
| Press Reset mid-generation | Cancels the request; no error shown, and the upstream generation is cancelled too |

### Build and static checks

```bash
npm run build      # production build; compiles and typechecks
npm run lint       # eslint
npx tsc --noEmit   # typecheck alone
```

All three pass on a clean checkout. `npm run build` is the meaningful one because it compiles and typechecks together.

There is **no automated test suite.** Verification for this project was done by exercising the API directly with `curl` before any UI existed, then by hand against the running app. This is a known gap, recorded in `.kiro/specs/clay-conversion/tasks.md`.

## How Kiro was used

Kiro was the development environment for this project, not an autocomplete bolted onto it. The full record is in the committed `.kiro/` directory, which judges can inspect.

```text
.kiro/
  specs/clay-conversion/
    requirements.md    what must be true, in EARS form
    design.md          how it works and why, with the rejected alternatives
    tasks.md           98 ordered tasks, with what each one found
  steering/
    product.md         what the app is for and what is deliberately excluded
    tech.md            stack, conventions, the lint rules worth knowing
    structure.md       where code belongs and why
    picx-integration.md  SDK rules, scoped to app/api/** only
  hooks/
    typecheck-on-save.json
    protect-env-local.json
```

### Spec-driven, not prompt-driven

The feature was built as a Kiro spec: requirements first, then design, then tasks, iterating on each before writing code.

The requirements are written in EARS form (`WHEN … THE SYSTEM SHALL …`) which forced decisions that would otherwise have surfaced late. Writing `THE SYSTEM SHALL NOT present a CSS or canvas effect as a conversion` is what turned "make it look like clay" into a testable constraint, and it is the reason the fake CSS filter was deleted rather than kept as a fallback.

`design.md` records the alternatives that were tested and rejected, so they are not retried: a `data:` URL in `image_urls` (rejected, URLs are capped at 2048 characters), and four other upload endpoints (`/uploads`, `/files`, `/media`, `/images/upload` — all 404). `/assets` is the only one that exists.

### Steering files carried the rules forward

Four steering files hold the project's conventions so they apply to every change without being restated.

`picx-integration.md` is the interesting one: it is scoped with `inclusion: fileMatch` on `app/api/**`, so the SDK rules load automatically whenever a route handler is touched and stay out of the way otherwise. **Every rule in that file exists because something went wrong without it**, and each one says so.

`tech.md` documents that `react-hooks/set-state-in-effect` is an error rather than a warning in this project, and what to do instead. That rule is why browser storage is read through `useSyncExternalStore` — the correct pattern for an external store — instead of being copied into state inside an effect.

### Task ordering was a deliberate decision

`tasks.md` is ordered backend-first: the route handler was built and verified with `curl` before a single component was touched.

That ordering paid off immediately. The API key turned out to be missing the upload scope, and because no UI existed yet, the failure surfaced on its own with nothing to untangle it from. It was diagnosed by calling the API directly — confirming `images:edit` *was* granted, since an invalid payload returned 422 rather than 403 — and then working through five candidate upload endpoints before establishing that `/assets` was the only one.

### Three bugs Kiro's task loop caught

Each of these is recorded in `tasks.md` with what was found and what changed.

1. **Stop-motion returned no clay at all.** The prompt opened with "a frame from a handmade stop-motion animation film" and mentioned film grain and cinematic lighting. The model read that as a photo filter and returned the original image with a grade applied. Rewriting it material-first, so every noun is a sculpted object and photography is never mentioned, fixed it. That finding became a steering rule: prompts lead with the material.
2. **Retries were costing 14 seconds and failing anyway.** When an edit returned 503 the SDK replayed it with the same idempotency key, and the API answered "Idempotent image edit is still processing". Measured, then set `maxRetries: 0` on the edit while leaving retries enabled on the upload, where they genuinely help.
3. **A stale architectural memo.** An earlier version remembered a 403 for the life of the server process to avoid retrying a call it knew would fail. Correct for a single server key — and wrong the moment keys became per-visitor, because one person's missing scope would have routed someone else's photo to a public host. Removing it was task 10.9.

### A security review before publishing

Section 14 of `tasks.md` records a full pre-release pass for key leakage: scanning for committed secrets in known formats, a generic high-entropy token scan to catch a format nobody thought to look for, auditing every `console.*` call, and confirming against the **built client bundle** — rather than inferring from imports — that no key and no server-only module ships to the browser.

It found three real problems, all fixed: an allowlist that trusted a public file host even when uploads to it were switched off, documentation claiming the key was session-scoped when it persists, and a line in this README inviting a live API key to be pasted into a committed file.

### Hooks

Two hooks, both narrow on purpose:

- **`typecheck-on-save.json`** — a `PostFileSave` hook matching `\.(ts|tsx)$` that runs `npx tsc --noEmit`, so a type error surfaces at the moment it is introduced rather than at build time
- **`protect-env-local.json`** — a `PreToolUse` hook on the file-writing tools. It inspects the pending write and, if it touches `.env.local`, returns an `ask` permission decision so the write pauses for confirmation. The point is that an automated edit cannot quietly overwrite or expose a working API key

The second one is the more interesting use of the feature: rather than blocking a path outright, it escalates a specific, narrow case to a human decision, and leaves every other write untouched.

### What Kiro did not decide

The product decisions were human: that a colour filter is a lie and had to go, that the progress bar must admit it is an estimate, that credit balances stay hidden, and that video and batch processing are out of scope even though the SDK supports the former. Kiro implemented and verified those decisions and pushed back on the details; it did not choose them.

## Architecture

```text
Photo selection
  → POST /api/upload      →  PicX managed asset URL
Generate click
  → POST /api/clay        →  PicX image edit result
```

**Two routes, not one.** Uploading and converting are separate endpoints so the upload can start the moment a photo is chosen. By the time Generate is pressed the URL usually exists, so the wait is only the model's time; a key that cannot upload fails in about a second instead of after a 20-second generation; and the progress stages are driven by which request is actually in flight rather than by a timer.

**Every PicX call is server-side.** The SDK runs fine in a browser, which is exactly why this is easy to get wrong — doing so would put the key in network traces the page itself can read back. `lib/picx.ts` carries a `window` guard that throws if it is ever reachable from client code.

**Visitor keys are never cached.** `getPicX(requestKey)` builds a client for that one request and discards it. A cached key would be used for another visitor's request, which is the failure mode this design exists to prevent.

### Project structure

- `app/page.tsx` — the column shell and hero, a server component. Passes only a boolean about whether a server key exists, never the key
- `app/layout.tsx` — metadata, viewport, fonts
- `app/api/upload/route.ts` — PicX managed-assets proxy, runs on photo selection
- `app/api/clay/route.ts` — PicX image-edit proxy, runs on Generate
- `app/globals.css` — all styling, four responsive breakpoints
- `components/clay-studio.tsx` — the stage, all shared state, both request lifecycles, cancellation
- `components/upload-panel.tsx` — style chips, Upload and Camera, Generate, status line
- `components/converter-panel.tsx` — tabbed viewer, progress overlay, result actions
- `components/camera-sheet.tsx` — live viewfinder, shutter, front/back switch
- `components/result-gallery.tsx` — the shelf of results saved on this device
- `components/settings-dialog.tsx` — the key button and the API key sheet
- `lib/picx.ts` — server-only PicX client, per-request for visitor keys
- `lib/picx-errors.ts` — shared mapping from typed SDK errors to responses
- `lib/api-key-store.ts` — device-local key storage, read via `useSyncExternalStore`
- `lib/gallery-store.ts` — device-local result URLs, newest first, capped at 24
- `lib/key-dialog.ts` — lets Generate open the key sheet that lives in the header
- `lib/clay-prompts.ts` — the four style presets and their instructions
- `lib/upload-limits.ts` — size and MIME rules, shared client and server
- `lib/public-upload.ts` — opt-in fallback uploader

## Security

- **No API key is committed to this repository.** `.env.example` carries placeholders only; `.env.local` is git-ignored
- **No key reaches the browser's own PicX calls.** The browser talks to Clayify's routes; the routes talk to PicX
- **The key travels in an `x-picx-key` header**, not a request body, and is never written to a log or placed in a URL
- **A saved key is only ever displayed masked.** The raw value never re-enters the DOM
- **Error detail depends on whose key failed.** A visitor's own rejected, empty or under-scoped key is named plainly because it is theirs to fix; the same failures on a server-side key stay vague, because naming them would leak configuration
- **Client-supplied URLs are host-allowlisted** before reaching the model
- **Errors are logged verbatim safely** — the SDK redacts the key from messages, bodies, headers, `toString()` and `JSON.stringify()`

## Known limitations

- **No deployment.** The app runs locally. A generation takes 19–27 seconds and can exceed a serverless function timeout; `maxDuration` is declared on both routes but not every platform honours it
- **No rate limiting.** The routes would be an open proxy to the PicX API if deployed publicly. Per-visitor keys mean there is no shared balance to drain, which is not the same as being safe to expose
- **No automated tests.** Verified by `curl` against the API and by hand against the app
- **The upload MIME type is client-declared.** The server trusts `file.type` rather than sniffing magic bytes. PicX validates the bytes itself, so exposure is small
- **Progress is an estimate**, and is labelled as one. The image endpoint is synchronous and returns no progress to report
- **The shelf stores links, not bytes.** If PicX stops serving an image, that thumbnail breaks
- **CSS class names are generic** (`.panel`, `.stage`, `.pill`), so merging this into another app would need CSS Modules or a prefix

## Attribution

### Third-party APIs and services

| Service | Used for | Terms |
| --- | --- | --- |
| [PicX Studio API](https://ai.picxstudio.com/) via the `picx-ai` SDK | `assets.create` to host the photo, `images.edit` to generate the clay result | Used with a key supplied by the person running the app, under PicX's own terms |
| [catbox.moe](https://catbox.moe/) | Optional, **disabled by default**. Public file host used only when `CLAY_UPLOAD_FALLBACK=catbox` is explicitly set | Subject to catbox's terms and upload rules |

### Frameworks and libraries

Runtime dependencies:

- [Next.js](https://nextjs.org/) 16.3.2 — MIT
- [React](https://react.dev/) and React DOM 19.2.8 — MIT
- [`picx-ai`](https://ai.picxstudio.com/) 0.2.1 — the official PicX SDK, pinned exactly because a minor bump in a `0.x` package can change the API

Development dependencies: [TypeScript](https://www.typescriptlang.org/) 5.9.3, [ESLint](https://eslint.org/) 9.39.5 with `eslint-config-next` 16.3.2, and the `@types` packages — all MIT.

Every dependency is pinned to an exact version, with no `^` ranges, so a clone builds reproducibly.

### Fonts

[Inter](https://fonts.google.com/specimen/Inter) and [Baloo 2](https://fonts.google.com/specimen/Baloo+2), both under the [SIL Open Font License 1.1](https://openfontlicense.org/), loaded and self-hosted at build time via `next/font/google`.

### Assets and datasets

**None.** There are no bundled images, icons, audio, video or datasets. Every icon in `components/icons.tsx` is an inline SVG written for this project. All styling is plain CSS in `app/globals.css`; no CSS framework is used. No datasets or third-party media are included or used for training.

All photos processed by the app are supplied by the person using it. Nothing is stored server-side.

## Team

Solo submission.

_If submitting as a team, list each member and their contribution here before submitting._

## License

No licence has been chosen. All rights are reserved, and this code is not licensed for reuse. An open-source licence is not required for this hackathon; publishing without one is a deliberate choice, not an oversight.
