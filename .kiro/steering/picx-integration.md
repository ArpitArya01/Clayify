---
inclusion: fileMatch
fileMatchPattern: 'app/api/**'
---

# Working with the PicX SDK

Hard-won rules. Each one exists because something went wrong without it.

## Keys are per visitor, and never cached

Each visitor brings their own key through the gear. It arrives in an
`x-picx-key` header and is passed to `getPicX(requestKey)`, which builds a client
for that one request and **never stores it**. Caching a visitor key would leak it
into another visitor's request — that is the bug to watch for here.

There is normally no server-side key at all. `PICX_API_KEY` is supported for local
convenience and left unset by default.

## The key never reaches the browser's PicX calls

Import `getPicX()` from `lib/picx.ts` and only from a route handler. Never from a
component, never from anything a client component imports. The SDK runs fine in a
browser, which is exactly why this is easy to get wrong.

The visitor's key does live in their browser, which is unavoidable — they typed it
in. What matters is that the browser calls *our* routes and never PicX directly,
so the key stays out of traces the page can read back. Read it from the store at
request time rather than holding it in React state.

Never prefix a key with `NEXT_PUBLIC_`.

Both routes declare `export const runtime = "nodejs"`. Keep it — `lib/picx.ts`
and `randomUUID` are Node-side, and an accidental edge runtime would fail at the
worst possible moment.

## Never log the key, and never put it in a URL

The key arrives in a header, so it is not in anything `formData()` returns and
cannot show up in a body log. Keep it that way:

- Do not log `request.headers`, and do not log the request itself.
- Do not put a key in a query string. URLs leak through referrers, proxies and
  access logs in ways headers do not.
- The audit for this is `grep` for `console\.` in `app/` and `lib/`, and confirm
  every hit is either the shared `PicXError` log or the fallback warning.

## Say what went wrong when the key is theirs

`lib/picx-errors.ts` takes a `visitorKey` flag. When the key came from the
visitor, a rejection, an empty balance or a missing scope is theirs to fix, so
name it plainly. When it came from the server, the same message would leak our
configuration, so stay vague.

One naming trap: the API says `uploads:write`, but the key-creation screen calls
that scope **Upload files**. Mention both or the visitor will not find it.

## `images.edit` takes URLs, not bytes

```ts
/** Source images to edit. Between 1 and 5 URLs. Required. */
image_urls: string[];
```

A local file has to become a public URL first, via `picx.assets.create()`. That
call needs the `uploads:write` scope on the key.

Two things that do **not** work, both verified:

- A `data:image/jpeg;base64,...` URL is rejected: *"image URLs must be no longer
  than 2048 characters"*.
- There is no other upload endpoint. `/uploads`, `/files`, `/media`,
  `/images/upload` and `/upload` all return 404. `/assets` is the only one.

## Fix output size on the server

```ts
const OUTPUT_SIZE = "1K" as const;
```

Never accept `size` from the request. A 1K edit costs 35 credits and 4K costs
more; letting the client choose lets anyone inflate the bill. Same reasoning
applies to `model`.

## Always pass an idempotency key

Credits are deducted **before** the model runs, so the SDK refuses to replay a
POST without one. Pass a fresh `randomUUID()` per call — a regenerate is meant to
produce a different image, so it must not deduplicate against the previous one.

## Turn retries off on `images.edit`

```ts
{ idempotencyKey: randomUUID(), maxRetries: 0 }
```

The default is 2. When an edit returns 503 the SDK replays it with the same
idempotency key and the API answers *"Idempotent image edit is still
processing"*. Measured cost: about 14 seconds of backoff, then failure anyway.
Fail fast and let the visitor press Generate Again.

Leave the default retries on `assets.create` — there a retry genuinely helps.

## Raise the timeout, never lower it

Image endpoints are synchronous and block until the image exists. The client is
configured with 180s per attempt against a 120s default. Measured real runs:
19s to 27s for 1K.

There is no progress to report mid-call. Any progress indicator is an estimate.

## Allowlist any URL that came from the client

Regeneration sends back an `assetUrl`. Without a host check, a crafted request
could spend a key editing any image on the internet.

```ts
function allowedAssetHosts(): string[] {
  return isFallbackEnabled() ? ["picxstudio.com", FALLBACK_HOST] : ["picxstudio.com"];
}
```

`picxstudio.com` always. **The fallback host only while the fallback is actually
switched on** — a source URL can only come from `/api/upload` or the fallback
uploader, so a host nothing writes to should not be trusted.

Listing it unconditionally was the earlier version, and it widened the allowlist
for every deployment including ones that never upload there. With a server-side
`PICX_API_KEY` configured, that let a crafted request spend our key editing
anything someone had parked on a public host.

The check also requires `https:`, and matches a host or a subdomain of it — never
a substring, or `picxstudio.com.evil.test` would pass.

## Pass the request signal through

```ts
{ signal: request.signal }
```

Otherwise a cancelled browser request leaves the upstream generation running and
burning credits.

## Branch on error classes, not message strings

```ts
if (error instanceof PicXPermissionError) { ... }
```

Every failure is a typed subclass of `PicXError` carrying `status`, `code` and
`requestId`. Map them to plain user messages, and let the `visitorKey` flag decide
how much to say — plainly when the key is the visitor's, vaguely when it is the
server's, as above. Either way the real reason belongs in the server log with its
`requestId`.

Matching on message text is only ever acceptable for narrowing *within* a class,
the way `PicXPermissionError` is split on `uploads:write` to name the right scope.
Never as the primary branch.

Logging the error verbatim is safe: the SDK redacts the key from messages,
bodies, headers, `toString()` and `JSON.stringify()`.

## Prompts must lead with the material

The Stop-motion style originally opened with "a frame from a stop-motion film"
and mentioned film grain and cinematic lighting. The model read that as a photo
filter and returned the original picture with a grade applied — no clay at all.

Lead with the material and make every noun a sculpted object. Do not mention
photography, film or grain. End with the identity clause from
`lib/clay-prompts.ts`, or the model redraws the subject instead of restyling it.

## Resources this app does not use

`video`, `generations`, `models`, `account` and `webhooks` are all available on
the client. `generations` is for polling async video jobs and does not apply to
images — a synchronous edit returns no job id to poll.
