import type { GenericExtrinsic } from "@polkadot/types"
import type { RuntimeDispatchInfo } from "@polkadot/types/interfaces"
import type { Codec } from "@polkadot/types-codec/types"
import { mergeUint8 } from "@polkadot-api/utils"
import type { JsonRpcRequestSend } from "../types"
import type { Chain } from "./types"

type ExtrinsicDispatchInfo = {
  partialFee: string
}

// used for chains that dont have metadata v15 yet
export const getExtrinsicDispatchInfo = async (
  chain: Chain,
  signedExtrinsic: GenericExtrinsic
): Promise<ExtrinsicDispatchInfo> => {
  if (!signedExtrinsic.isSigned)
    throw new Error("Extrinsic must be signed (or fakeSigned) in order to query fee")

  const len = signedExtrinsic.registry.createType("u32", signedExtrinsic.encodedLength)

  const dispatchInfo = (await stateCall(
    chain.connector.send,
    "TransactionPaymentApi_query_info",
    "RuntimeDispatchInfo",
    [signedExtrinsic, len],
    undefined,
    true
  )) as RuntimeDispatchInfo

  return {
    partialFee: dispatchInfo.partialFee.toString(),
  }
}

const stateCall = async <K extends string = string>(
  request: JsonRpcRequestSend,
  method: string,
  resultType: K,
  args: Codec[],
  blockHash?: `0x${string}`,
  isCacheable?: boolean
) => {
  // on a state call there are always arguments
  const registry = args[0].registry

  const bytes = registry.createType("Raw", mergeUint8(...args.map((arg) => arg.toU8a())))

  const result = await request("state_call", [method, bytes.toHex(), blockHash], isCacheable)

  return registry.createType(resultType, result)
}
