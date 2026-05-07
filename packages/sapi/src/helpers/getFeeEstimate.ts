import { Binary } from "polkadot-api"

import { encodeFakeSignedExtrinsic } from "./encodeExtrinsic"
import { getRuntimeCallResult } from "./getRuntimeCallResult"
import type { SignerPayloadJSON } from "./signedPayloadTypes"
import type { Chain, ChainInfo } from "./types"

export const getFeeEstimate = async (
  chain: Chain,
  payload: SignerPayloadJSON,
  _chainInfo: ChainInfo
) => {
  const bytes = encodeFakeSignedExtrinsic(payload)
  const binary = Binary.fromBytes(bytes)

  const result = await getRuntimeCallResult<{ partial_fee: bigint }>(
    chain,
    "TransactionPaymentApi",
    "query_info",
    [binary, bytes.length]
  )
  // Do not throw if partialFee is 0n. This is a valid response, eg: Bittensor remove_stake fee estimation is 0n.
  if (!result?.partial_fee && result.partial_fee !== 0n) {
    throw new Error("partialFee is not found")
  }
  return result.partial_fee
}
