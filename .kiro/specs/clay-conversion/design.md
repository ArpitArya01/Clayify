# Design — Clay Conversion

## Pipeline

Two round trips, not one. Uploading runs when the photo is chosen; generating
runs when the button is pressed.

```text
BROWSER (client component)
  choose photo  →  local preview via URL.createObjectURL (no network)
        │
        │  POST /api/upload    FormData: file + filename
        │                      header:   x-picx-key
        ▼
SERVER  picx.assets.create()  →  { url, id }
        │
        ▼
BROWSER  hold the URL in a ref, report "ready"
  choose style
  press Generate
        │
        │  POST /api/clay      FormData: assetUrl + style
        │                      header:   x-picx-key
        ▼
SERVER  1. validate style id and the client-supplied URL
        2. style id  →  hardcoded instruction text
        3. picx.images.edit()  →  { url }
        │
        ▼
BROWSER  show result, save it to the device shelf,
         enable Download / Share / Generate Again
```

## Why two routes

One endpoint would have to wait for Generate before it learned anything about
the photo. Splitting them buys three things:

- **The wait is only the model's time.** By the time Generate is pressed the
  asset URL usually exists, so the 20 seconds is generation and nothing else.
- **A key that cannot upload fails in about a second**, on selection, instead of
  after a full generation.
- **The progress stages are real.** The client knows which step it is on, rather
  than switching labels on a timer.

Regenerating reuses the asset URL from the first upload, so it re-enters at
step 3.

When adding a step, the question to ask is *when should this run* — on selection
or on Generate — and put it in the matching route.

## Why the work is server-side

The SDK runs happily in a browser, so the tempting design is to call it directly
from the component. Then the key sits in network traces the page itself can read
back, which is strictly worse than the alternative.

So every PicX call lives in a route handler. The browser receives a URL and
nothing else — never the model, the prompt, or the size.

## Keys belong to visitors

There is normally **no server-side key at all**. Each visitor pastes their own
through the gear in the header.

That single decision removes a whole class of problem: with no shared key there
is no shared credit balance to drain, and the app cannot spend one visitor's key
on another visitor's request.

| Concern | Design |
| --- | --- |
| Where it lives | `localStorage` under `clayify.picx-key`, via `lib/api-key-store.ts` |
| Why not `sessionStorage` | A 69-character key retyped every visit is worse than persisting it, for a tool nobody signs into |
| How it is read | `useSyncExternalStore`, never copied into state in an effect |
| How it travels | `x-picx-key` header, not the form body, so body logging cannot capture it |
| Server handling | `getPicX(requestKey)` builds a client for that one request and **never caches it** |
| What crosses to the client | Only `serverKeyConfigured`, a boolean, from `app/page.tsx` |
| Shown back to the visitor | `maskKey()` only — `pxsk_1234…cbc2`. The raw key never re-enters the DOM |

`PICX_API_KEY` is still supported for local convenience and left unset by
default. A visitor's key always wins over it.

Caching a visitor key is the bug to watch for in this codebase. It would leak
one visitor's key into another's request, and nothing else about the design would
look wrong while it happened.

## `images.edit` takes URLs, not bytes

A file on the visitor's disk has to become a URL the API can fetch.
`picx.assets.create()` does that, and it needs the `uploads:write` scope.

Alternatives were tested and ruled out:

| Approach | Result |
| --- | --- |
| `data:` URL in `image_urls` | 422 — URLs capped at 2048 characters |
| Other upload endpoints | `/uploads`, `/files`, `/media`, `/images/upload`, `/upload` all 404 |

`/assets` is the only one.

## Request and response shapes

| Route | Sends | Returns |
| --- | --- | --- |
| `POST /api/upload` | `file`, `filename`, `x-picx-key` | `{ url, id }`, or `{ url, id: null, fallback: true }` |
| `POST /api/clay` | `assetUrl`, `style`, `x-picx-key` | `{ url }` |

`assetUrl` arrives from the client, so it is checked against a host allowlist
before it reaches the model. Without that check a crafted request could spend a
key editing any image on the internet.

The allowlist is `picxstudio.com`, **plus the fallback host only while the
fallback is switched on**. Listing the public host unconditionally widened the
allowlist for every deployment including ones that never upload there — and with
a server-side `PICX_API_KEY` configured, that let a crafted request spend our key
editing anything parked on that host.

## Styles and prompts

Four presets in `lib/clay-prompts.ts`, each an id, a label, and an instruction.
The client sends only the id. The server resolves it and rejects anything
unrecognised.

Every instruction ends with a shared identity clause. Without it the model
redraws the subject rather than restyling it — the difference between "my photo
as clay" and "some clay figure".

Prompts lead with the material. An early Stop-motion prompt opened with "a frame
from a handmade stop-motion animation film" and mentioned film grain and
cinematic lighting; the model read that as a photo filter and returned the
original image with a grade applied and no clay. Rewriting it so every noun is a
sculpted object, with no mention of film, fixed it.

## Progress is an estimate

`images.edit` is a single synchronous call that reports nothing until it returns.
There is no percentage to read, and no job to poll — polling exists in the SDK
only for async video generations.

Design: an eased ramp toward a 92% ceiling on a 200ms tick, snapping to 100% only
when the response lands. It cannot claim completion early, and it is labelled
"usually around 20 seconds. This is an estimate." so the number on screen is
understood for what it is. Measured runs: 19s, 25s, 27s.

Two stages are shown, `uploading` then `sculpting`. Unlike a timer-based guess,
the switch is driven by which request is actually in flight.

## State

All shared state lives in `components/clay-studio.tsx`; both panels are
presentational and communicate through props and callbacks.

| State | Why it exists |
| --- | --- |
| `sourceUrl` | what the preview shows — an object URL for the chosen photo |
| `sourceFile` | the bytes to upload, and what a retry re-sends |
| `uploadState`, `uploadError` | selection-time upload has its own outcome to report |
| `fileError` | rejected before any network call, so it is not an upload failure |
| `isDragging` | drop-target affordance |
| `styleId`, `tab`, `phase`, `stage`, `progress`, `resultUrl`, `error` | |

`sourceUrl` and `resultUrl` are separate fields. Sharing one is what allowed the
original prototype to fake the conversion by restyling the source in place.

Refs, not state, for anything that must not trigger a render: `assetUrlRef` (so
an upload finishing during other state changes cannot be read stale), the two
`AbortController`s, the progress interval and its running value, and the object
URL awaiting revocation.

Panels hold only genuinely local state — the drag-hover flag, a transient notice
in `ResultActions`, the camera sheet's own stream and facing. `StatusLine` derives
everything from props, so there is no child state to reset and no reason to
remount anything.

## Choosing a photo

Three ways in — the picker, the camera, and dropping a file on the stage — all
funnel through one `chooseFile` in `clay-studio.tsx`. That is what makes the
validation in `lib/upload-limits.ts` unskippable: a fourth route in has to go
through the same door.

Validation runs in the browser for immediate feedback and again in the route
handler, because the client cannot be trusted. Both import the same constants so
they cannot disagree about what a valid photo is.

### Camera

`components/camera-sheet.tsx` takes the frame in the page with `getUserMedia` and
a canvas, rather than handing off to the OS camera app with a `capture` file
input. A `capture` input on a desktop is just the file picker again, so "Camera"
would mean two different things.

- The front camera preview is mirrored so it reads like a mirror, and flipped
  back on the canvas so the captured frame matches reality.
- The captured frame becomes a JPEG `File` and goes through `chooseFile` like any
  other photo.
- `getUserMedia` needs a secure context, so on plain HTTP over a LAN address it
  is absent and the `capture` input is used instead.
- The stream is stopped on `close`, which covers Escape and the close button
  alike. A stream left running keeps the camera light on behind a closed sheet.

## The device shelf

`lib/gallery-store.ts` remembers results in `localStorage`, newest first, capped
at 24.

What is stored is the **result URL, not the image bytes**. A generation already
returns a PicX-hosted link, so the shelf costs a few hundred bytes instead of
megabytes of base64 and stays well inside the storage quota. The trade is that
these are links: if PicX stops serving one, the thumbnail breaks and the visitor
removes it.

Two implementation details that are load-bearing:

- **The snapshot is cached.** `useSyncExternalStore` compares snapshots by
  reference, so parsing JSON on every read would loop forever. Empty returns one
  frozen shared array for the same reason.
- **URLs are validated as `https:` on read.** They are handed to `<img src>` and,
  on the download fallback, to `window.open`. Anything that is not plain https is
  dropped, so a `javascript:` entry written into storage by other means cannot
  become a click target.

Nothing here reaches the server. There is no account and no sync — clearing site
data clears the shelf, and another device knows nothing about it.

## Opening the key sheet from Generate

The sheet lives in the header; Generate lives in the upload panel. Their only
common ancestor is `app/page.tsx`, a server component, so there is no client
parent to lift the dialog's open state into.

`lib/key-dialog.ts` is a module-level subscription that carries the one
imperative call across, without turning the page into a client component. Nothing
about the key travels through it — only the request to open.

Generate checks for a key first and opens the sheet instead of firing a request
that could only come back as an error.

## Cancellation

Reset and any new generation abort the request in flight. Both route handlers
forward `request.signal` into the SDK, so a cancelled browser request also
cancels the upstream call — otherwise the generation completes, spends credits,
and nobody sees it. A client-side `AbortError` is swallowed rather than shown as
a failure.

## Error mapping

Typed SDK errors in, plain messages out. Branching on error classes rather than
message strings is what keeps this predictable.

How much detail is safe depends on **whose key failed**. A visitor's own key
being rejected, empty or under-scoped is theirs to fix, so it is named plainly.
The same failures on a server-side key stay vague, because naming them would leak
our configuration. `respondToPicXError` takes a `visitorKey` flag for exactly
this.

| SDK error | HTTP | Visitor's key | Server's key |
| --- | --- | --- | --- |
| `MissingApiKeyError` | 400 | add a key using the settings button | same |
| `PicXAuthenticationError` | 401 | that key was rejected, check settings | not configured correctly |
| `PicXPermissionError` (`uploads:write`) | 403 | enable **Upload files** (`uploads:write`) | 500, not configured correctly |
| `PicXPermissionError` (other) | 403 | check `images:edit` is enabled | 500, not configured correctly |
| `PicXInsufficientCreditsError` | 402 | this key has no credits left | temporarily unavailable |
| `PicXRateLimitError` | 429 | try again in N seconds, plus `Retry-After` | same |
| `PicXValidationError` | 400 | try a different photo | same |
| `PicXTimeoutError` | 504 | took too long | same |
| `PicXGenerationFailedError` | 502 | conversion failed | same |
| `PicXError` (other) | 502 | the service returned an error | same |
| anything else | 500 | something went wrong | same |
| `PicXAbortError` | 499 | no body — the listener is gone | same |

One naming trap: the API says `uploads:write`, but the key-creation screen calls
that scope **Upload files**. The message names both or the visitor will not find
it.

The real reason always goes to the server log with its `requestId`. Logging the
error verbatim is safe: the SDK redacts the key from messages, bodies, headers,
`toString()` and `JSON.stringify()`.

## Cost controls

- `size` is a server constant, never read from the request. A 1K edit costs 35 credits.
- `model` is left to the server default for the same reason.
- A fresh `idempotencyKey` per call, because credits are deducted before the model runs and the SDK will not replay a POST without one. Fresh, because a regenerate is meant to produce a different image and must not deduplicate against the previous one.
- `maxRetries: 0` on the edit. On 503 the SDK replays with the same key and the API answers "Idempotent image edit is still processing" — roughly 14 seconds of backoff, then failure regardless. Retries stay enabled on `assets.create`, where they help.
- Per-attempt timeout raised to 180s against a 120s default, because image endpoints block until the image exists. Raise this, never lower it.

## Fallback uploader — off by default

`images.edit` reads URLs, so a key without **Upload files** cannot convert a
local photo at all. Rather than only failing, `lib/public-upload.ts` can upload
the photo to a public file host and hand the model that URL instead.

Three properties keep it honest:

1. **Off unless asked.** Requires `CLAY_UPLOAD_FALLBACK=catbox`.
2. **Proper path first.** `assets.create` is always attempted, and only a
   `PicXPermissionError` triggers the fallback. There is deliberately **no
   process-level memo** of that 403 — an earlier version remembered it for the
   life of the process, which was correct for a single server key and became
   wrong the moment keys were per visitor. One visitor's missing scope would have
   routed another visitor's photo to the public host.
3. **Logged loudly**, stating that photos are leaving our control.

Trade-off, stated plainly: while this is on, the visitor's photo sits on a
third-party public host at an unauthenticated URL and is not deleted
automatically. It is a demo workaround. The real fix is the scope.

The default behaviour is to fail with a message naming the scope to enable.

## Download and share

The result is cross-origin, where the `download` attribute is ignored and the
browser navigates instead. So the bytes are fetched into a blob, saved from an
object URL, and the URL revoked. If that fetch is blocked by CORS, the image
opens in a new tab rather than failing silently.

Share prefers the native share sheet and falls back to copying the link. A
dismissed share sheet is not an error.

## Known gaps

- **No rate limiting.** Because each visitor brings their own key there is no shared balance to drain, but a public deployment would still be an open proxy to the PicX API. This is the main reason the app is positioned to run locally.
- **A visitor's key transits the server** that serves the app. Unavoidable given the design, and the safer of the two options — but anyone deploying this for others should not log request headers.
- **Upload MIME type is client-declared.** The route trusts `file.type` rather than sniffing magic bytes. PicX validates the bytes itself, so the exposure is small — but with the public-host fallback enabled it becomes a file relay, which is another reason to leave the fallback off.
- **A 20–27 second call may exceed a serverless function timeout.** `maxDuration` is declared but only some hosts honour it.
- **CSS class names are generic** (`.panel`, `.stage`, `.pill`). Merging this into another app would need CSS Modules or a prefix.
