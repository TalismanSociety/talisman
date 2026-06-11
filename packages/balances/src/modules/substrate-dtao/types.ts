import type { bittensor } from "@polkadot-api/descriptors"
import { SubDTaoTokenSchema } from "@talismn/chaindata-provider"
import z from "zod/v4"

import { TokenConfigBaseSchema } from "../../types/tokens"

// to be used by chaindata too
export const SubDTaoTokenConfigSchema = z.strictObject({
  netuid: SubDTaoTokenSchema.shape.netuid,
  ...TokenConfigBaseSchema.shape,
})

export type SubDTaoTokenConfig = z.infer<typeof SubDTaoTokenConfigSchema>

export type SubDTaoBalanceMeta = {
  scaledAlphaPrice: string
  convictionLock?: SubDTaoConvictionLockMeta
}

export type SubDTaoConvictionLockType = "decaying" | "perpetual"

export type SubDTaoConvictionLockMeta = {
  type: "conviction-lock"
  hotkey: string
  lockType: SubDTaoConvictionLockType
  conviction: string
  convictionRaw: string
  convictionFormat: "U64F64"
  lastUpdate: string
}

export type SubDTaoBalance = {
  address: string
  tokenId: string
  baseTokenId: string
  stake: bigint
  pendingRootClaim?: bigint
  convictionLock?: SubDTaoConvictionLock
  hotkey: string
  netuid: number
  scaledAlphaPrice: bigint
}

export type SubDTaoConvictionLock = {
  amount: bigint
  hotkey: string
  lockType: SubDTaoConvictionLockType
  conviction: string
  convictionRaw: string
  lastUpdate: string
}

export type GetDynamicInfosResult =
  (typeof bittensor)["descriptors"]["apis"]["SubnetInfoRuntimeApi"]["get_all_dynamic_info"][1]

export type GetStakeInfosResult =
  (typeof bittensor)["descriptors"]["apis"]["StakeInfoRuntimeApi"]["get_stake_info_for_coldkeys"][1]

/**
 * `undefined` when the coldkey has no lock on the subnet; `null` is our own fetch-failure marker.
 * `conviction` is the raw U64F64 fixed-point value (shift right by 64 bits for the integer part),
 * despite decoding as a plain bigint.
 */
export type GetColdkeyLockResult =
  | (typeof bittensor)["descriptors"]["apis"]["StakeInfoRuntimeApi"]["get_coldkey_lock"][1]
  | null
