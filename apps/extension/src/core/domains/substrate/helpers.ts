import { ERA_PERIOD, toPjsHex } from "@talismn/sapi"
import type { SignerPayloadJSON } from "../../types/pjsInterop"
import type { MevShieldWindow } from "./types"

// a signature can take long enough to reach the end of the payload's mortal era: the node rejects
// a payload outside its era as a bad signature
export const MIN_ERA_BLOCKS_TO_SUBMIT = 4

export const getEraBlocksLeftAt = (payload: SignerPayloadJSON, bestNumber: number) => {
  const blocksSinceBirth = bestNumber - Number(payload.blockNumber)
  if (!Number.isFinite(blocksSinceBirth)) throw new Error("Invalid payload block number")
  return Math.max(0, ERA_PERIOD - blocksSinceBirth)
}

/** subtensor's CheckMortality rejects a `submit_encrypted` with a longer era as stale */
export const MEV_SHIELD_ERA_PERIOD = 8

// NextKey read at block N belongs to the author of block N + 2, the only one who can decrypt it
const MEV_SHIELD_KEY_AUTHOR_OFFSET = 2

const MEV_SHIELD_DEADLINE_MARGIN_MS = 3_000

/** The block proposer applies the outer wrapper first, so the inner transaction takes nonce + 1 */
export const getMevShieldInnerPayload = (payload: SignerPayloadJSON): SignerPayloadJSON => ({
  ...payload,
  nonce: toPjsHex(BigInt(payload.nonce) + 1n),
})

export const getMevShieldDeadline = (headAt: number, blockTimeMs: number) =>
  headAt + MEV_SHIELD_KEY_AUTHOR_OFFSET * blockTimeMs - MEV_SHIELD_DEADLINE_MARGIN_MS

export const isMevShieldWindowOpen = (
  { headNumber, deadline }: MevShieldWindow,
  bestNumber: number,
  now: number
) => bestNumber < headNumber + MEV_SHIELD_KEY_AUTHOR_OFFSET && now < deadline
