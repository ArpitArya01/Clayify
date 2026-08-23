# Product

Clayify turns a photograph into clay art. Someone uploads a photo, picks one of
four clay styles, presses one button, and gets back an image of the same subject
rendered as a sculpted clay figure.

## The problem it solves

Clay-style portraits are popular but making one by hand needs sculpting skill, or
an artist, or a working knowledge of image-generation prompts. Most "clay filter"
tools are colour filters: they tint the photo and leave the geometry untouched,
so the result still looks like a photograph.

Clayify does the real transformation. The subject's shapes are rebuilt as clay
volumes with visible fingerprint texture and matte lighting, while the pose,
expression and framing stay recognisable. The user writes no prompt and makes no
technical decisions.

## Who it is for

Anyone who wants a clay version of a photo of themselves, a pet, or a friend —
for a profile picture, a gift, or a social post. No account, no signup.

## What the user does

1. Drops in a photo, picks one with Upload, or takes one with Camera.
2. Picks a clay style: Cute Claymation, Polymer Clay, Stop-motion, or Ceramic.
3. Presses **Generate Clay Art** and waits roughly twenty seconds.
4. Downloads the result, shares it, or regenerates for a different take.
5. Comes back later and finds it still on the shelf, on that device.

## Deliberately out of scope

- **Video.** The PicX SDK can generate video, but this is a photo tool.
- **Batch processing.** One image at a time keeps the interface honest about cost.
- **Accounts and server-side history.** Nothing is persisted server-side. Results
  are remembered in the browser only, as a shelf of links to the images PicX
  already hosts. Clearing site data clears it, and another device knows nothing
  about it.
- **Prompt editing.** The user never writes or sees a prompt. Styles are presets.
- **Credit or usage display.** Deliberately hidden from the interface.

## Principles

**Never present a fake result as a real one.** The first version of this app used
a CSS `filter` to tint the photo. It looked like a feature and was not one. Any
transformation shown to the user is produced by the model.

**Be honest about what is estimated.** The image API is synchronous and reports
nothing until it finishes, so the progress bar is an estimate. It is labelled
with an expected duration rather than pretending to measure real progress.

**One click.** Every option the user does not need is a decision they should not
have to make. Model choice, output size, aspect ratio and prompt are all fixed.
