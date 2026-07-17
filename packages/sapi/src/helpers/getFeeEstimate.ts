import { createV4Tx } from "@polkadot-api/signers-common"
import { getPjsTxHelper } from "@polkadot-api/tx-utils"
import { CUSTOM_SIGNED_EXTENSIONS } from "../customSignedExtensions"
import log from "../log"
import type { SignerPayloadJSON } from "../pjsInterop"
import { getExtrinsicDispatchInfo } from "./getExtrinsicDispatchInfo"
import { getRuntimeCallResult } from "./getRuntimeCallResult"
import { getAddressBytes, isEthereumAddress } from "./papi"
import type { Chain } from "./types"

/** strips the leading compact length prefix from an encoded extrinsic */
const stripLengthPrefix = (tx: Uint8Array): Uint8Array => {
  const mode = tx[0] & 3
  const prefixLen = mode === 0 ? 1 : mode === 1 ? 2 : mode === 2 ? 4 : 1 + (tx[0] >> 2) + 4
  return tx.subarray(prefixLen)
}

export const getFeeEstimate = async (chain: Chain, payload: SignerPayloadJSON) => {
  // build a fake-signed extrinsic - fees depend on the encoded length, not the signature content
  const { callData, extra } = getPjsTxHelper(chain.hexMetadata, CUSTOM_SIGNED_EXTENSIONS)(payload)
  const fakeSignature = isEthereumAddress(payload.address)
    ? new Uint8Array(65) // AccountId20 chains: raw 65-byte signature, no MultiSignature prefix
    : new Uint8Array(66).fill(2, 0, 1) // MultiSignature ecdsa variant, the longest (type byte + 65) so the length fee is never underestimated

  const signedTx = createV4Tx(
    chain.metadata,
    getAddressBytes(payload.address),
    fakeSignature,
    [extra],
    callData
  )

  const bytes = stripLengthPrefix(signedTx)

  try {
    const result = await getRuntimeCallResult<{ partial_fee: bigint }>(
      chain,
      "TransactionPaymentApi",
      "query_info",
      [bytes, bytes.length]
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
  const { partialFee } = await getExtrinsicDispatchInfo(chain, signedTx)

  return BigInt(partialFee)
}
