import { toHex } from "@polkadot-api/utils"
import { AccountId } from "polkadot-api"
import { bool, compact, Struct, u8, Vector } from "scale-ts"

export const SUBTENSOR_ROOT_NETUID = 0

const BittensorAccountPrefix = 42
const BittensorAccountId = AccountId(BittensorAccountPrefix)

/** For encoding/decoding the GetStakeInfoForColdkey runtime api *after* they added the netuid parameter */
const StakeInfo = Struct({
  hotkey: BittensorAccountId,
  coldkey: BittensorAccountId,
  netuid: compact,
  stake: compact,
  locked: compact,
  emission: compact,
  drain: compact,
  isRegistered: bool,
})
export const EncodeParams_GetStakeInfoForColdkey = (address: string) =>
  toHex(BittensorAccountId.enc(address))
export const DecodeResult_GetStakeInfoForColdkey = (result: string) => Vector(StakeInfo).dec(result)

/** For encoding/decoding the GetStakeInfoForColdkey runtime api *before* they added the netuid parameter */
const StakeInfo_old = Struct({
  hotkey: BittensorAccountId,
  coldkey: BittensorAccountId,
  stake: compact,
})
export const EncodeParams_old_GetStakeInfoForColdkey = (address: string) =>
  vecEncodeParams(BittensorAccountId.enc(address))
export const DecodeResult_old_GetStakeInfoForColdkey = (result: string) =>
  Vector(StakeInfo_old).dec(vecDecodeResult(result))

/**
 * The (old) Subtensor runtime APIs are double-encoded.
 *
 * For requests, the parameters are first SCALE-encoded using their types.
 * The result of this type encoding is a byte array (`requestBytes`).
 * This byte array is then *again* encoded as a `Vector(u8)`, and **those** bytes are submitted to the chain.
 */
const vecEncodeParams = (requestBytes: Uint8Array) =>
  toHex(Vector(u8).enc(Array.from(requestBytes)))

/**
 * The (old) Subtensor runtime APIs are double-encoded.
 *
 * For responses, the bytes of the result are first SCALE-decoded as a `Vector(u8)`.
 * The result of this decoding is a byte array (which is the return value of this function).
 * This byte array is then *again* decoded using the SCALE type of the response.
 */
const vecDecodeResult = (resultBytes: string) => new Uint8Array(Vector(u8).dec(resultBytes))
