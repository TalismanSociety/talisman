import { assert } from "@talismn/util"
import { strictHexToU8a } from "../../util/strictHexToU8a"
import type { VrfSignPayload } from "./types"

/**
 * Maximum decoded size of each dapp-provided field. The schnorrkel transcript accepts any length;
 * these bounds exist so a site cannot enqueue a payload that the approval popup then has to hold
 * and render.
 */
const MAX_DATA_BYTES = 64 * 1024
const MAX_CONTEXT_BYTES = 1024

/**
 * Validates and decodes the dapp-provided fields of a VRF signing request. Called at the
 * `pub(vrf.sign)` boundary so a malformed payload never opens a popup, and again just before the
 * secret key is used.
 *
 * An omitted `context` means "empty". An empty *string* is malformed rather than omitted: `"0x"`
 * is how a caller asks for empty bytes.
 */
export const parseVrfSignPayload = (payload: VrfSignPayload) => {
  // schnorrkel's `extra` binds the proof transcript without changing the output, so a caller
  // passing it would derive one identity from what they think are several. Rejected rather than
  // ignored, so the mistake surfaces instead of returning a proof they can't verify.
  assert(!("extra" in payload), "Invalid extra: VRF signing does not take extra transcript data")

  return {
    data: strictHexToU8a(payload.data, "data", MAX_DATA_BYTES),
    context:
      payload.context === undefined
        ? undefined
        : strictHexToU8a(payload.context, "context", MAX_CONTEXT_BYTES),
  }
}
