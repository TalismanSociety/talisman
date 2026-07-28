import { assert } from "@talismn/util"
import { strictHexToU8a } from "../../util/strictHexToU8a"
import type { VrfSignPayload } from "./types"

// schnorrkel accepts any length; these bounds keep the approval popup from having to render an
// arbitrarily large payload
const MAX_DATA_BYTES = 64 * 1024
const MAX_CONTEXT_BYTES = 1024

/**
 * Validates and decodes a VRF signing request. Called at the `pub(vrf.sign)` boundary so a
 * malformed payload never opens a popup, and again just before the secret key is used.
 *
 * An omitted `context` means "empty"; an empty *string* is malformed, `"0x"` is how a caller asks
 * for empty bytes.
 */
export const parseVrfSignPayload = (payload: VrfSignPayload) => {
  // rejected rather than ignored: `extra` changes the proof but not the output, so a caller using
  // it as a domain separator has to find out
  assert(!("extra" in payload), "Invalid extra: VRF signing does not take extra transcript data")

  return {
    data: strictHexToU8a(payload.data, "data", MAX_DATA_BYTES),
    context:
      payload.context === undefined
        ? undefined
        : strictHexToU8a(payload.context, "context", MAX_CONTEXT_BYTES),
  }
}
