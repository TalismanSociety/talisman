import { toHex } from "@polkadot-api/utils"
import { AccountId } from "polkadot-api"
import { bool, compact, Struct, Vector } from "scale-ts"

export const SUBTENSOR_ROOT_NETUID = 0
export const SUBTENSOR_MIN_STAKE_AMOUNT_PLANK = 1000000n

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
  tao_emission: compact,
  drain: compact,
  isRegistered: bool,
})

export const EncodeParams_GetStakeInfoForColdkey = (address: string) =>
  toHex(BittensorAccountId.enc(address))
export const DecodeResult_GetStakeInfoForColdkey = (result: string) => Vector(StakeInfo).dec(result)
