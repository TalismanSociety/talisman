import type { KeypairCurve } from "@talismn/crypto"
import type { SignerPayloadJSON } from "@talismn/sapi"
import { assert } from "@talismn/util"

import { getMetadataDef } from "../metadata/getMetadataDef"
import { getMetadataRpcFromDef } from "../metadata/helpers"
import { assemblePjsTransaction, type SignPjsPayloadResult, signPjsPayload } from "./signPjsPayload"

export type { SignPjsPayloadResult } from "./signPjsPayload"

type PayloadMetadataOptions = {
  /**
   * reject metadata from another runtime than the payload names, which `getMetadataDef` falls back
   * to when the chain upgraded or is unreachable: the spec and transaction versions are encoded from
   * the metadata, so a `createTransaction` payload validated byte for byte would change
   */
  exactRuntime?: boolean
}

const getPayloadMetadataRpc = async (
  payload: SignerPayloadJSON,
  { exactRuntime }: PayloadMetadataOptions = {}
) => {
  const specVersion = parseInt(payload.specVersion, 16)
  const metadataDef = await getMetadataDef(payload.genesisHash, specVersion)
  assert(
    !exactRuntime || metadataDef?.specVersion === specVersion,
    `Unable to find metadata for runtime ${specVersion} of chain ${payload.genesisHash}`
  )
  const metadataRpc = getMetadataRpcFromDef(metadataDef)
  assert(metadataRpc, `Unable to find metadata for chain ${payload.genesisHash}`)
  return metadataRpc
}

/**
 * Assembles a signed extrinsic from a payload and a ready-made (prefixed) signature,
 * using the wallet's cached metadata for the target chain.
 */
export const assembleSubstrateTransaction = async (
  payload: SignerPayloadJSON,
  signature: Uint8Array | `0x${string}`,
  options?: PayloadMetadataOptions
) => assemblePjsTransaction(await getPayloadMetadataRpc(payload, options), payload, signature)

/**
 * Signs a `SignerPayloadJSON` using the wallet's cached metadata for the target chain.
 * See `signPjsPayload` for the underlying implementation.
 */
export const signSubstratePayload = async (
  payload: SignerPayloadJSON,
  secretKey: Uint8Array,
  curve: KeypairCurve,
  options?: PayloadMetadataOptions & {
    /** chaindata override forcing the signature type prefix on/off (LAOS signing quirk) */
    hasExtrinsicSignatureTypePrefix?: boolean
  }
): Promise<SignPjsPayloadResult> =>
  signPjsPayload(await getPayloadMetadataRpc(payload, options), payload, secretKey, curve, options)
