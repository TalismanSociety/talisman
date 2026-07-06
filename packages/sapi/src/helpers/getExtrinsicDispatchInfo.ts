import { Metadata, TypeRegistry } from "@polkadot/types"
import type { RuntimeDispatchInfo } from "@polkadot/types/interfaces"
import { mergeUint8, toHex } from "@polkadot-api/utils"

import type { Chain } from "./types"

type ExtrinsicDispatchInfo = {
  partialFee: string
}

// fee estimation fallback for chains that dont have metadata v15 yet
// (still polkadot-js based - the runtime-call codecs needed to do this with papi require metadata v15)
export const getExtrinsicDispatchInfo = async (
  chain: Chain,
  bareTxBytes: Uint8Array
): Promise<ExtrinsicDispatchInfo> => {
  const registry = new TypeRegistry()
  registry.setMetadata(new Metadata(registry, chain.hexMetadata))

  const len = registry.createType("u32", bareTxBytes.length)

  const result = await chain.connector.send(
    "state_call",
    ["TransactionPaymentApi_query_info", toHex(mergeUint8([bareTxBytes, len.toU8a()]))],
    true
  )

  const dispatchInfo = registry.createType("RuntimeDispatchInfo", result) as RuntimeDispatchInfo

  return {
    partialFee: dispatchInfo.partialFee.toString(),
  }
}
