import { u32, u128 } from "@polkadot-api/substrate-bindings"
import { fromHex, mergeUint8, toHex } from "@polkadot-api/utils"

import type { Chain } from "./types"

type ExtrinsicDispatchInfo = {
  partialFee: string
}

// fee estimation fallback for chains that dont have metadata v15 yet
// (the runtime-call codecs needed to decode this with the dynamic builder require metadata v15)
export const getExtrinsicDispatchInfo = async (
  chain: Chain,
  // the full encoded extrinsic, INCLUDING its compact length prefix: the runtime
  // decodes the uxt argument as an opaque length-prefixed UncheckedExtrinsic
  signedTxBytes: Uint8Array
): Promise<ExtrinsicDispatchInfo> => {
  const args = mergeUint8([signedTxBytes, u32.enc(signedTxBytes.length)])

  const result = (await chain.connector.send(
    "state_call",
    ["TransactionPaymentApi_query_info", toHex(args)],
    true
  )) as `0x${string}`

  // RuntimeDispatchInfo = { weight: WeightV1 (u64) | WeightV2 (2x compact), class: enum (1 byte), partial_fee: u128 }
  // the weight shape varies across old runtimes, but partial_fee is always the trailing fixed-size field
  const bytes = fromHex(result)
  if (bytes.length < 16) throw new Error("Invalid RuntimeDispatchInfo")
  // .slice (copy), NOT .subarray: papi codecs read offset views from the buffer start
  const partialFee = u128.dec(bytes.slice(bytes.length - 16))

  return {
    partialFee: partialFee.toString(),
  }
}
