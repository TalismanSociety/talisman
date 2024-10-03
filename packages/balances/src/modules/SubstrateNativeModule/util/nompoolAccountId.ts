import { mergeUint8 } from "@polkadot-api/utils"
import { AccountId, SS58String } from "polkadot-api"
import { u32 } from "scale-ts"

/**
 * Each nominationPool in the nominationPools pallet has access to some accountIds which have no
 * associated private key. Instead, they are derived from this function.
 */
const nompoolAccountId = (palletId: string, poolId: string | number, index: number): SS58String => {
  const utf8Encoder = new TextEncoder()
  const encModPrefix = utf8Encoder.encode("modl")
  const encPalletId = utf8Encoder.encode(palletId)

  const encIndex = new Uint8Array([index])
  const encPoolId = u32.enc(typeof poolId === "string" ? parseInt(poolId, 10) : poolId)

  const length = encModPrefix.length + encPalletId.length + encIndex.length + encPoolId.length
  const remainingBytes = 32 - length
  const encEmptyH256 = new Uint8Array(remainingBytes)

  const bytes = mergeUint8(encModPrefix, encPalletId, encIndex, encPoolId, encEmptyH256)

  return AccountId().dec(bytes)
}
/** The stash account for the nomination pool */
export const nompoolStashAccountId = (palletId: string, poolId: string | number) =>
  nompoolAccountId(palletId, poolId, 0)
/** The rewards account for the nomination pool */
export const nompoolRewardAccountId = (palletId: string, poolId: string | number) =>
  nompoolAccountId(palletId, poolId, 1)
