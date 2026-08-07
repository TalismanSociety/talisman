import type { ScaleApi } from "@talismn/sapi"

type GetBittensorSettingsPayloadProps = {
  sapi: ScaleApi
  address: string
  /** target state: true => accept incoming locked alpha (the on-chain `enabled` flag is its inverse) */
  acceptLockedAlpha: boolean
}

/**
 * Builds the Bittensor settings extrinsic: `set_reject_locked_alpha` (spec 421+; the chain
 * rejects incoming locked alpha by default, so `enabled` is the inverse of "accept").
 */
export const getBittensorSettingsPayload = ({
  sapi,
  address,
  acceptLockedAlpha,
}: GetBittensorSettingsPayloadProps) =>
  sapi.getExtrinsicPayload(
    "SubtensorModule",
    "set_reject_locked_alpha",
    { enabled: !acceptLockedAlpha },
    { address }
  )
