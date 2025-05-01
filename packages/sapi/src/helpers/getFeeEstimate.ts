import { IRuntimeVersionBase, SignatureOptions, SignerPayloadJSON } from "@polkadot/types/types"
import { Binary } from "polkadot-api"

import log from "../log"
import { getExtrinsicDispatchInfo } from "./getExtrinsicDispatchInfo"
import { getRuntimeCallResult } from "./getRuntimeCallResult"
import { getTypeRegistry } from "./getTypeRegistry"
import { Chain, ChainInfo } from "./types"

export const getFeeEstimate = async (
  chain: Chain,
  payload: SignerPayloadJSON,
  chainInfo: ChainInfo,
) => {
  // TODO do this without PJS / registry => waiting for @polkadot-api/tx-utils
  const registry = getTypeRegistry(chain, payload)
  const extrinsic = registry.createType("Extrinsic", payload)

  extrinsic.signFake(payload.address, {
    appId: 0,
    nonce: payload.nonce,
    blockHash: payload.blockHash,
    genesisHash: payload.genesisHash,
    runtimeVersion: {
      specVersion: chainInfo.specVersion,
      transactionVersion: chainInfo.transactionVersion,
      // other fields aren't necessary for signing
    } as IRuntimeVersionBase,
  } as SignatureOptions)

  const bytes = extrinsic.toU8a(true)
  const binary = Binary.fromBytes(bytes)

  try {
    const result = await getRuntimeCallResult<{ partial_fee: bigint }>(
      chain,
      "TransactionPaymentApi",
      "query_info",
      [binary, bytes.length],
    )
    // Do not throw if partialFee is 0n. This is a valid response, eg: Bittensor remove_stake fee estimation is 0n.
    if (!result?.partial_fee && result.partial_fee !== 0n) {
      throw new Error("partialFee is not found")
    }
    return result.partial_fee
  } catch (err) {
    log.error("Failed to get fee estimate using getRuntimeCallValue", { err })
  }

  // fallback to pjs encoded state call, in case the above fails (extracting runtime calls codecs might require metadata V15)
  // Note: PAPI will consider TransactionPaymentApi as first class api so it should work even without V15, but this is not the case yet.
  const { partialFee } = await getExtrinsicDispatchInfo(chain, extrinsic)

  return BigInt(partialFee)
}
