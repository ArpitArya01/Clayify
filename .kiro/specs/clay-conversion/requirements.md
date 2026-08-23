# Requirements — Clay Conversion

A static prototype of this page already existed: the full layout, styling and
responsive behaviour, with a CSS `filter` standing in for the conversion and a
`setInterval` standing in for progress. This spec covers replacing both with a
real image-generation pipeline built on the PicX `picx-ai` SDK.

Terms used below: a **source** is the photo the visitor chose, whether picked,
captured or dropped. A **result** is the clay image the model returns. A **style**
is one of four named presets, each mapping to a fixed prompt. An **asset URL** is
a publicly fetchable URL for the source, which the edit endpoint requires. The
**shelf** is the list of results remembered on the visitor's own device.

## Conversion

### Real transformation

WHEN a visitor requests a conversion
THE SYSTEM SHALL produce the result from an image-generation model

THE SYSTEM SHALL NOT present a CSS or canvas effect as a conversion

WHEN the model returns a result
THE SYSTEM SHALL keep the subject's pose, expression and framing recognisable

WHEN a result is displayed
THE SYSTEM SHALL load it from its own URL rather than restyling the source in place

### Style selection

THE SYSTEM SHALL offer exactly four styles: Cute Claymation, Polymer Clay,
Stop-motion and Ceramic

THE SYSTEM SHALL keep the prompt behind each style hidden and uneditable

WHEN a conversion is requested
THE SYSTEM SHALL send only a style identifier and resolve the prompt server-side

IF a style identifier is unrecognised
THEN THE SYSTEM SHALL reject the request with status 400

WHEN a visitor changes style while a result is displayed
THE SYSTEM SHALL clear that result, because it no longer matches the controls

The edit endpoint requires a non-empty `instruction`, so a prompt always exists.
What this requires is that the *visitor* never authors one.

## Choosing a photo

### Ways in

THE SYSTEM SHALL accept a photo picked through the file input, captured with the
camera, or dropped onto the stage

THE SYSTEM SHALL route every one of those through a single code path, so that
validation cannot be skipped by one of them

WHEN a photo is accepted
THE SYSTEM SHALL show a local preview without waiting for any network call

### Validation

THE SYSTEM SHALL accept JPG, PNG and WEBP

IF a file is of any other type
THEN THE SYSTEM SHALL refuse it with a readable message

IF a file is larger than 20MB
THEN THE SYSTEM SHALL refuse it with a readable message

IF a file is empty
THEN THE SYSTEM SHALL refuse it with a readable message

THE SYSTEM SHALL apply these rules in the browser for immediate feedback and
again on the server, because the client cannot be trusted

THE SYSTEM SHALL share the size and type constants between the browser and the
server, so the two cannot disagree about what a valid photo is

IF a photo is refused before any request is made
THEN THE SYSTEM SHALL NOT report it as an upload failure

### Camera

WHEN a visitor presses Camera and the browser can open a video stream
THE SYSTEM SHALL show a live viewfinder in the page with a shutter

THE SYSTEM SHALL NOT hand the capture off to the operating system's camera app
when a viewfinder is possible, because on a desktop that is only the file picker
again

WHILE the front camera is previewing
THE SYSTEM SHALL mirror the preview, so it reads like a mirror

WHEN a frame is captured from the front camera
THE SYSTEM SHALL un-mirror the saved frame, so it matches what was in front of it

WHEN a frame is captured
THE SYSTEM SHALL treat it as a photo chosen by any other means, including
validation and upload

WHERE more than one camera exists
THE SYSTEM SHALL offer a front and back switch

IF camera permission is denied or no camera exists
THEN THE SYSTEM SHALL say which, and leave the other ways in working

IF the browser cannot open a video stream at all
THEN THE SYSTEM SHALL fall back to the operating system's camera

WHEN the camera sheet closes, by any means including Escape
THE SYSTEM SHALL stop the stream, so the camera indicator cannot stay lit behind
a closed sheet

### Hosting the source

WHEN a photo is accepted
THE SYSTEM SHALL begin uploading it immediately rather than waiting for Generate

WHILE an upload is in progress
THE SYSTEM SHALL report that state and disable Generate

WHEN an upload completes
THE SYSTEM SHALL report the photo as ready before Generate is pressed

IF an upload fails
THEN THE SYSTEM SHALL show why and offer a retry

WHEN a visitor chooses a different photo while an upload is in flight
THE SYSTEM SHALL abandon that upload

## Generating

### Explicit generation

WHEN a visitor chooses a photo
THE SYSTEM SHALL NOT start a conversion

WHEN a visitor presses Generate
THE SYSTEM SHALL start the conversion

WHILE no source is chosen
THE SYSTEM SHALL keep Generate disabled

WHILE an upload or a conversion is running
THE SYSTEM SHALL keep Generate disabled

WHEN settings are changed after a result
THE SYSTEM SHALL allow another generation without re-choosing the photo

### Progress

WHILE a conversion is running
THE SYSTEM SHALL display a progress indicator

THE SYSTEM SHALL NOT claim to measure progress, because the image endpoint is
synchronous and reports nothing until it returns

THE SYSTEM SHALL NOT reach 100% before the result has arrived

THE SYSTEM SHALL state an expected duration in plain words, and say that it is an
estimate

WHILE uploading and WHILE generating
THE SYSTEM SHALL distinguish the two stages, driven by which request is actually
in flight rather than by a timer

## Using the result

WHEN a result arrives
THE SYSTEM SHALL show it, rather than leaving the visitor on the source

WHEN a visitor presses Download and a result exists
THE SYSTEM SHALL save the image as a file

The result is served cross-origin, where the `download` attribute is ignored, so
the bytes have to be fetched before being saved.

IF fetching those bytes is blocked
THEN THE SYSTEM SHALL open the image rather than failing silently

WHEN a visitor presses Share and a result exists
THE SYSTEM SHALL offer the native share sheet, falling back to copying the link

IF a visitor dismisses the share sheet
THEN THE SYSTEM SHALL NOT report it as an error

WHEN a visitor generates again
THE SYSTEM SHALL produce a new result without re-uploading the source

THE SYSTEM SHALL NOT deduplicate one generation against the previous one, because
generating again is meant to produce a different image

WHILE no result exists
THE SYSTEM SHALL keep Download and Share disabled

## Remembering results

WHEN a result arrives
THE SYSTEM SHALL save it to the shelf on that device

THE SYSTEM SHALL show the shelf newest first

THE SYSTEM SHALL store result URLs rather than image bytes, because a generation
already returns a hosted link

THE SYSTEM SHALL cap the shelf, so it stays a strip and stays inside the storage
quota

THE SYSTEM SHALL NOT store the same result twice

WHEN a visitor taps a saved result
THE SYSTEM SHALL put it back in the viewer, where it can be downloaded again

WHEN a visitor removes a saved result
THE SYSTEM SHALL forget it

WHEN a visitor reloads the page, or presses Reset
THE SYSTEM SHALL keep the shelf

THE SYSTEM SHALL NOT persist anything server-side, so the shelf is that device
only and clearing site data clears it

IF a stored entry is malformed, or is not a plain `https` URL
THEN THE SYSTEM SHALL drop it, because these URLs become image sources and click
targets

## Failure and recovery

IF any request fails
THEN THE SYSTEM SHALL show a readable message in place of the result

WHEN a failure concerns a key the visitor supplied
THE SYSTEM SHALL name the problem plainly, because it is theirs to fix

WHEN a failure concerns a key the server supplied
THE SYSTEM SHALL stay vague, because naming it would leak our configuration

IF a key is missing the upload scope
THEN THE SYSTEM SHALL name it the way the key-creation screen does, as
**Upload files**, as well as `uploads:write`

IF a request is rate limited
THEN THE SYSTEM SHALL tell the visitor how long to wait, using the value the API
returned

THE SYSTEM SHALL branch on the SDK's typed error classes rather than on message
strings

THE SYSTEM SHALL log the real reason with its request id, and return only the
plain message

WHEN a visitor presses Reset
THE SYSTEM SHALL cancel any request in flight

WHEN a request is cancelled
THE SYSTEM SHALL NOT report it as an error

WHEN a browser request is cancelled
THE SYSTEM SHALL cancel the upstream generation, so credits are not spent on a
result nobody will see

## Keys and cost

### Visitor-supplied keys

THE SYSTEM SHALL accept an API key from each visitor through the settings sheet

THE SYSTEM SHALL use a visitor's key only for that visitor's requests

THE SYSTEM SHALL NOT cache a visitor's key, because a cached key would be used
for another visitor's request

THE SYSTEM SHALL NOT require a server-side key

WHERE a server-side key is configured
THE SYSTEM SHALL prefer a key supplied by the visitor

WHEN no key is available
THE SYSTEM SHALL still load and display the interface

WHEN a visitor presses Generate with no key available
THE SYSTEM SHALL ask for one, rather than sending a request that can only fail

WHEN a key is saved
THE SYSTEM SHALL show it masked, so the visitor can confirm which one is in use
without it being readable

THE SYSTEM SHALL let a visitor forget a saved key

### Protecting keys

THE SYSTEM SHALL keep every PicX call server-side

THE SYSTEM SHALL NOT call PicX directly from the browser, which would place the
key in traces the page can read back

THE SYSTEM SHALL NOT expose any key through a `NEXT_PUBLIC_` variable

THE SYSTEM SHALL send only the fact that a server-side key exists to the browser,
never the key

THE SYSTEM SHALL read the visitor's key at request time rather than holding it in
component state

THE SYSTEM SHALL send the key in a header rather than a request body

THE SYSTEM SHALL NOT place a key in a URL, where it would leak through referrers
and logs

THE SYSTEM SHALL NOT write a key to any log

### Controlling cost

THE SYSTEM SHALL fix the output size server-side and ignore any size in the
request, so a crafted call cannot raise the cost of a generation

THE SYSTEM SHALL fix the model server-side for the same reason

IF a source URL supplied by the client is not on the host allowlist
THEN THE SYSTEM SHALL reject the request

THE SYSTEM SHALL restrict the allowlist to hosts a source URL can actually come
from, so a host is not trusted while the path that writes to it is switched off

THE SYSTEM SHALL send a fresh idempotency key with every generation, because
credits are deducted before the model runs

THE SYSTEM SHALL NOT retry a failed edit, because a replay is answered with
"idempotent image edit is still processing" and fails anyway after a delay

THE SYSTEM SHALL NOT display credit balances or usage

## Out of scope

Video generation, batch conversion, accounts, server-side persistence,
cross-device history, prompt editing, model selection, and aspect-ratio selection
— the edit endpoint has no `aspect_ratio` parameter in the SDK's types.
