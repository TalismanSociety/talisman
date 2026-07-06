import type { SignerPayloadJSON } from "@polkadot-api/tx-utils"
import type { KeypairCurve } from "@talismn/crypto"
import { assert } from "@talismn/util"

import { getMetadataDef } from "../../util/getMetadataDef"
import { getMetadataRpcFromDef } from "../metadata/helpers"
import { assemblePjsTransaction, type SignPjsPayloadResult, signPjsPayload } from "./signPjsPayload"

export type { SignPjsPayloadResult } from "./signPjsPayload"
export { getSignedExtrinsicHash } from "./signPjsPayload"

/**
 * Assembles a signed extrinsic from a payload and a ready-made (prefixed) signature,
 * using the wallet's cached metadata for the target chain.
 */
export const assembleSubstrateTransaction = async (
  payload: SignerPayloadJSON,
  signature: Uint8Array | `0x${string}`
) => {
  const metadataDef = await getMetadataDef(payload.genesisHash, parseInt(payload.specVersion, 16))
  const metadataRpc = getMetadataRpcFromDef(metadataDef)
  assert(metadataRpc, `Unable to find metadata for chain ${payload.genesisHash}`)

  return assemblePjsTransaction(metadataRpc, payload, signature)
}

/**
 * Signs a `SignerPayloadJSON` using the wallet's cached metadata for the target chain.
 * See `signPjsPayload` for the underlying implementation.
 */
export const signSubstratePayload = async (
  payload: SignerPayloadJSON,
  secretKey: Uint8Array,
  curve: KeypairCurve,
  options?: {
    /** chaindata override forcing the signature type prefix on/off (LAOS signing quirk) */
    hasExtrinsicSignatureTypePrefix?: boolean
  }
): Promise<SignPjsPayloadResult> => {
  const metadataDef = await getMetadataDef(payload.genesisHash, parseInt(payload.specVersion, 16))
  const metadataRpc = getMetadataRpcFromDef(metadataDef)
  assert(metadataRpc, `Unable to find metadata for chain ${payload.genesisHash}`)

  return signPjsPayload(metadataRpc, payload, secretKey, curve, options)
}
