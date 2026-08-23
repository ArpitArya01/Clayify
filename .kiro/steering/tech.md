# Tech

## Stack

| Package | Version | Notes |
| --- | --- | --- |
| next | 16.3.2 | App Router, Turbopack |
| react / react-dom | 19.2.8 | |
| typescript | 5.9.3 | `strict: true` |
| picx-ai | 0.2.1 | PicX Studio SDK — **exact pin, no caret** |
| eslint | 9.39.5 | |
| eslint-config-next | 16.3.2 | native flat config |

Node 20 or newer, because `picx-ai` requires it.

## Commands

```bash
npm run dev      # dev server on :3000
npm run build    # production build, also runs TypeScript
npm run lint     # eslint
npm start        # serve the production build
npx tsc --noEmit # typecheck alone
```

Run `npm run build` before claiming a change works. It compiles *and*
typechecks, so it catches more than `npm run dev`.

## Version pinning

Every dependency is pinned to an exact version, no `^` ranges. `picx-ai` is a
0.x package where a minor bump can break the API, and the build needs to be
reproducible for anyone cloning the repo.

## Conventions

**Plain CSS, not Tailwind.** All styling lives in `app/globals.css` and is built
on CSS custom properties defined in `:root`. Use the existing variables
(`--clay`, `--brown`, `--muted`, `--line`, `--shadow`) rather than new literals.

**Plain `<img>`, not `next/image`.** The layout depends on `object-fit` and
`aspect-ratio`, and sources are runtime values — object URLs for local previews
and remote CDN URLs for results. `next/image` fights both. Each `<img>` carries
an `eslint-disable-next-line @next/next/no-img-element` with that reason.

**Four responsive breakpoints:** 1100px, 820px, 560px, 360px. A new component
needs to be checked at all four. The column is capped at 460px, so the wide two
only trim the padding around it; real tuning happens at 560px and below, where
the column is the whole screen.

**The page is not pinned to the viewport height.** An earlier version forced the
whole app into `100dvh`, which is what pushed type down to 11px and made it look
like a shrunken mockup. The column flows and the page scrolls instead. The viewer
is a square (`aspect-ratio: 1 / 1`, capped at `60vh`) rather than "whatever
height is left", so it is the same size everywhere.

## Lint rules worth knowing

`react-hooks/set-state-in-effect` is an **error**, not a warning. Calling
`setState` synchronously in an effect body will fail the build. Two patterns
cover nearly everything it rejects:

- **Reading browser storage:** use `useSyncExternalStore`, never an effect that
  copies the value into state. `lib/api-key-store.ts` and `lib/gallery-store.ts`
  are both shaped for it — a subscribe function, a cached snapshot, and a stable
  server snapshot. The cache is not optional: snapshots are compared by
  reference, so parsing JSON on every read loops forever.
- **Resetting a child's state:** remount it with a changing `key` rather than
  syncing through an effect. Nothing needs this today, because both panels are
  driven entirely by props and `StatusLine` derives its message instead of storing
  it. Keeping them prop-driven is what stops the question coming up.

The `key` on the `<img>` elements in `converter-panel.tsx` is a different thing —
it remounts the element to replay the reveal animation, not to reset state.

## Environment

**There is normally nothing to configure.** Each visitor pastes their own PicX key
into the gear in the header and it stays in their browser, so `npm install` then
`npm run dev` is the whole setup. Both environment variables are optional and
unset by default:

- `PICX_API_KEY` — a server-side key, for local convenience only. Leaving it unset
  is the intended setup, because it means the app cannot spend one key on another
  visitor's request. A key supplied in the browser always wins over it.
- `CLAY_UPLOAD_FALLBACK` — set to `catbox` to route uploads through a public file
  host when a key lacks **Upload files**. Demo escape hatch: it sends the
  visitor's photo to a third party, so leave it unset.

Secrets go in `.env.local`, which is git-ignored. `.env.example` is committed and
documents every variable with a **placeholder, never a real value** — it is the
one env file that ships.

Never prefix a secret with `NEXT_PUBLIC_`. That inlines the value into the client
bundle where anyone can read it.

Environment variables are read once at startup. **Changing `.env.local` requires
restarting the dev server** — hot reload will not pick it up. Changing the key in
the gear does not, because it is read from storage per request.

## Accessibility

Icon-only buttons need an `aria-label`. Toggle buttons need `aria-pressed`. The
progress bar carries `role="progressbar"` with `aria-valuenow`. Live regions use
`aria-live="polite"`.

Animation lives in one `Motion` section near the end of `globals.css`, and the
`prefers-reduced-motion` block after it switches off every animation and
transition with a wildcard. Keep new motion in that section, and never let
anything the app needs depend on an animation having run.
