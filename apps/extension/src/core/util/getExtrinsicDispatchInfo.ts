import { featuresStore } from "@core/domains/app/store.features"
import RpcFactory from "@core/libs/RpcFactory"
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

  if (await featuresStore.isFeatureEnabled("FEE_FROM_STATE_CALL")) {
    const len = signedExtrinsic.registry.createType("u32", signedExtrinsic.encodedLength)

    const dispatchInfo = await stateCall(
      chainId,
      "TransactionPaymentApi_query_info",
      "RuntimeDispatchInfo",
      [signedExtrinsic, len],
      blockHash
    )

    return {
      partialFee: dispatchInfo.partialFee.toString(),
    }
  } else {
    // Legacy approach, returns non encoded object
    return RpcFactory.send(chainId, "payment_queryInfo", [signedExtrinsic.toHex(), blockHash])
  }
}
