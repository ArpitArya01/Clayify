# Structure

```text
app/
  api/upload/route.ts  file → PicX managed asset URL, runs on photo selection
  api/clay/route.ts    asset URL → clay image, runs on Generate
  layout.tsx           metadata, viewport, Inter + Baloo 2 via next/font
  page.tsx             server component: shell, header, static hero, footer
  globals.css          all styling, four breakpoints
components/
  clay-studio.tsx      client: the stage, all shared state, both lifecycles
  upload-panel.tsx     client: style pills, Upload/Camera, Generate, status line
  converter-panel.tsx  client: ConverterPanel (tabs, viewer, progress) and
                       ResultActions (download, share, reset)
  camera-sheet.tsx     client: Camera button, live viewfinder, shutter
  result-gallery.tsx   client: the shelf of results saved on this device
  settings-dialog.tsx  client: key button and the API key sheet
  site-header.tsx      brand + key button
  site-footer.tsx      static
  icons.tsx            inline SVGs
lib/
  picx.ts              server-only PicX client, per-request for visitor keys
  picx-errors.ts       shared typed-error → response mapping
  api-key-store.ts     browser-side key storage
  gallery-store.ts     browser-side list of result URLs, newest first
  key-dialog.ts        open-the-key-sheet channel, header ↔ studio
  clay-prompts.ts      the four style presets and their instructions
  upload-limits.ts     size and MIME constraints, shared client + server
  public-upload.ts     opt-in fallback uploader
.kiro/
  steering/            these conventions; picx-integration is scoped to app/api/**
  specs/               requirements → design → tasks for the conversion feature
  hooks/               typecheck on save, confirm writes to .env.local
```

`.kiro/` is committed on purpose. The specs are the reasoning behind the code, so
a change that contradicts them should update them in the same pass rather than
leaving the two to disagree.

## One column, one stage

The page is a single column capped at 460px: header, hero, stage, footer. The
stage holds the viewer, the style pills, the buttons, the result actions and the
shelf, in that order.

Every row keeps its natural height and the page scrolls if it needs to, so a new
control costs scroll rather than shrinking the viewer. Sizes are set for reading
at arm's length — do not shave them down to make something fit on one screen.

## Two routes, not one

Uploading and converting are separate endpoints so the upload can start the
moment a photo is chosen. Generate then usually has a URL already, and a key that
cannot upload fails immediately instead of after a twenty second generation. It
also makes the progress stages real rather than guessed on a timer.

If you add a step, ask when it should run — on selection or on Generate — and put
it in the matching route.

## Where things belong

**Server-only code goes in `lib/` and is imported only from `app/api/`.**
`lib/picx.ts` handles the API key and must never be reachable from a client
component. It has a `window` guard that throws if it ever is.

**Error responses come from `lib/picx-errors.ts`.** Both routes share it, so a
failure reads the same either side. It takes a `visitorKey` flag because how much
detail is safe depends on whose key failed.

**Browser storage lives behind a `lib/` store, read with
`useSyncExternalStore`.** `api-key-store.ts` and `gallery-store.ts` both follow
the same shape: a subscribe function, a cached snapshot, and a stable server
snapshot. The cache matters — `getSnapshot` is compared by reference, so parsing
JSON on every read would loop. Never copy these into state inside an effect.

Treat what comes back out of storage as untrusted input, not as something you
wrote. Anything can put a value under a `localStorage` key, and the shelf's URLs
end up as `<img src>` and as a `window.open` target — so `gallery-store.ts`
shape-checks every entry and drops anything that is not a plain `https` URL. Every
read path needs a `try`/`catch` too, because storage is unavailable outright in
some private modes.

**Shared constants go in `lib/`.** `upload-limits.ts` is imported by both the
browser form and the route handler so the two can never disagree about what a
valid upload is. Validate on both sides: the client for fast feedback, the server
because the client cannot be trusted.

**All state lives in `clay-studio.tsx`.** The two panels are presentational and
communicate through props and callbacks. They hold only state that is genuinely
local — drag-hover, the filename label, a transient notice.

## Adding things

**A new clay style:** add an entry to `CLAY_STYLES` in `lib/clay-prompts.ts`.
Nothing else changes; the chips render from that array and the route validates
against it. Going from four styles to two makes the chip grid two-up on its own.

**A new PicX call:** add it to `app/api/clay/route.ts` or a sibling route
handler, never to a component. Read `picx-integration.md` first.

**A new UI control:** if it affects the generation request it belongs in
`upload-panel.tsx` and its value must be lifted into `clay-studio.tsx`. If it
acts on the result it belongs in `ResultActions` in `converter-panel.tsx`.

**A new way to supply a photo:** route it through `chooseFile` in
`clay-studio.tsx`. The picker, the camera input and the drop target all share it,
so validation from `lib/upload-limits.ts` cannot be skipped by one of them.

## Naming

Files are kebab-case. Components are PascalCase named exports, not default
exports. Wire types from the API keep their snake_case field names so what the
SDK docs show is what the code reads.
