import type { ScaleApi } from "@talismn/sapi"

import type { RootClaimType, RootClaimTypeEnum } from "../../hooks/bittensor/dTao/types"

/** Maps a reward type (+ subnets for KeepSubnets) to the `set_root_claim_type` enum argument. */
const createRootClaimTypeEnum = (
  claimType: RootClaimType,
  selectedSubnets?: number[]
): RootClaimTypeEnum => {
  if (claimType === "KeepSubnets") {
    // ensure subnets are plain numbers and sorted (chain expects a specific format)
    const subnets = (selectedSubnets ?? []).map((n) => Number(n)).sort((a, b) => a - b)
    return { type: "KeepSubnets", value: { subnets } }
  }
  return { type: claimType, value: undefined } as RootClaimTypeEnum
}

type GetBittensorSettingsPayloadProps = {
  sapi: ScaleApi
  address: string
  /** include a set_root_claim_type call (the reward type and/or its selected subnets changed) */
  includeClaimSettings: boolean
  claimType: RootClaimType
  selectedSubnets?: number[]
  /** include a set_reject_locked_alpha call (the accept-locked-alpha toggle changed) */
  includeRejectFlag: boolean
  /** target state: true => accept incoming locked alpha (the on-chain `enabled` flag is its inverse) */
  acceptLockedAlpha: boolean
}

type CallDescriptor = { pallet: string; method: string; args: Record<string, unknown> }

/**
 * Builds the Bittensor settings extrinsic from only the values that changed:
 * - `set_root_claim_type` when the reward type or its selected subnets changed,
 * - `set_reject_locked_alpha` when the accept-locked-alpha toggle changed (spec 421+; the chain
 *   rejects incoming locked alpha by default, so `enabled` is the inverse of "accept").
 *
 * 0 changes => `null` (nothing to submit). 1 change => that call directly. 2 changes => the pair
 * wrapped in `Utility.batch_all` so they apply atomically.
 */
export const getBittensorSettingsPayload = ({
  sapi,
  address,
  includeClaimSettings,
  claimType,
  selectedSubnets,
  includeRejectFlag,
  acceptLockedAlpha,
}: GetBittensorSettingsPayloadProps) => {
  const descriptors: CallDescriptor[] = []

  if (includeClaimSettings)
    descriptors.push({
      pallet: "SubtensorModule",
      method: "set_root_claim_type",
      args: { new_root_claim_type: createRootClaimTypeEnum(claimType, selectedSubnets) },
    })

  if (includeRejectFlag)
    descriptors.push({
      pallet: "SubtensorModule",
      method: "set_reject_locked_alpha",
      args: { enabled: !acceptLockedAlpha },
    })

  if (descriptors.length === 0) return null

  if (descriptors.length === 1) {
    const { pallet, method, args } = descriptors[0]
    return sapi.getExtrinsicPayload(pallet, method, args, { address })
  }

  const calls = descriptors.map((d) => sapi.getDecodedCall(d.pallet, d.method, d.args))
  return sapi.getExtrinsicPayload("Utility", "batch_all", { calls }, { address })
}
