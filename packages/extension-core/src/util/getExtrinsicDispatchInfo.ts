import { GenericExtrinsic } from "@polkadot/types"
import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"

import { stateCall } from "./stateCall"

// this type structure is compatible with V1 result object
type ExtrinsicDispatchInfo = {
  partialFee: string // planck
}

export const getExtrinsicDispatchInfo = async (
  chainId: string,
  signedExtrinsic: GenericExtrinsic,
  blockHash?: HexString
): Promise<ExtrinsicDispatchInfo> => {
  assert(signedExtrinsic.isSigned, "Extrinsic must be signed (or fakeSigned) in order to query fee")

  const len = signedExtrinsic.registry.createType("u32", signedExtrinsic.encodedLength)

  const { err, val: dispatchInfo } = await stateCall(
    chainId,
    "TransactionPaymentApi_query_info",
    "RuntimeDispatchInfo",
    [signedExtrinsic, len],
    blockHash
  )

  if (err) throw new Error(dispatchInfo)

  return {
    partialFee: dispatchInfo.partialFee.toString(),
  }
}
