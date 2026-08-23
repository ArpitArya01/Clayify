/**
 * Clay style presets.
 *
 * The PicX `images.edit` endpoint requires an `instruction` string, so every
 * generation carries a prompt. The user never writes or sees one — they pick a
 * style chip and the matching instruction is sent server-side.
 *
 * Each instruction ends with an identity clause. Without it the model tends to
 * redraw the subject rather than restyle it, which is the difference between
 * "my photo as clay" and "some clay figure".
 */

const KEEP_SUBJECT =
  "Preserve the subject's identity, pose, facial features, framing and composition exactly. " +
  "Do not add or remove any elements.";

export const CLAY_STYLES = [
  {
    id: "cute",
    label: "Cute Claymation",
    instruction:
      "Transform this photo into a cute claymation character sculpted from soft modelling clay. " +
      "Rounded chunky forms, slightly oversized head, smooth matte clay surface with gentle " +
      "handmade thumbprint dents, warm pastel clay colours, soft diffused studio lighting, " +
      "shallow depth of field, plain warm neutral backdrop. " +
      KEEP_SUBJECT,
  },
  {
    id: "polymer",
    label: "Polymer Clay",
    instruction:
      "Transform this photo into a handcrafted polymer clay sculpture. " +
      "Dense plasticine material with a slightly waxy matte finish, visible fingerprint texture " +
      "and tiny tool marks, subtle seams where clay pieces were pressed together, " +
      "rich saturated clay colours, soft top-down studio light with gentle shadows. " +
      KEEP_SUBJECT,
  },
  {
    id: "stopmotion",
    // Earlier wording led with "a frame from a stop-motion film" and mentioned
    // film grain and cinematic lighting. The model read that as a photo filter
    // and returned the original picture with a graded, grainy look instead of
    // any clay at all. Leading with the material fixes it: every noun here is a
    // sculpted object, and nothing suggests photography.
    label: "Stop-motion",
    instruction:
      "Rebuild this entire scene as handmade clay stop-motion animation puppets and props. " +
      "Every surface is modelling clay: matte clay skin with visible sculpting seams and " +
      "fingerprint dents, hair sculpted into thick clay ribbons, clothing modelled in clay with " +
      "soft chunky folds, and the background rebuilt as a small hand-built clay set. " +
      "Warm tungsten studio lighting, shallow depth of field. " +
      KEEP_SUBJECT,
  },
  {
    id: "ceramic",
    label: "Ceramic",
    instruction:
      "Transform this photo into a glazed ceramic figurine. " +
      "Smooth thrown-and-fired clay body, soft satin glaze with subtle glossy highlights and " +
      "faint crackle in the finish, muted earthenware palette of terracotta, cream and sage, " +
      "visible potter's tool marks near the base, soft even studio lighting on a plain backdrop. " +
      KEEP_SUBJECT,
  },
] as const;

export type ClayStyleId = (typeof CLAY_STYLES)[number]["id"];

export const DEFAULT_CLAY_STYLE: ClayStyleId = "cute";

/** Look up a style by id. Returns `undefined` for anything unrecognised. */
export function findClayStyle(id: string | null | undefined) {
  if (!id) return undefined;
  return CLAY_STYLES.find((style) => style.id === id);
}
