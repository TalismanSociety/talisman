import { createV4Tx } from "@polkadot-api/signers-common"
import { Blake2256 } from "@polkadot-api/substrate-bindings"
import {
  blake2b256,
  type KeypairCurve,
  SIGNATURE_TYPE_PREFIX,
  signSubstrate,
} from "@talismn/crypto"
import {
  CUSTOM_SIGNED_EXTENSIONS,
  getAddressBytes,
  getPjsTxHelper,
  type SignerPayloadJSON,
} from "@talismn/sapi"
import { parseMetadataRpc, type UnifiedMetadata } from "@talismn/scale"
import type { HexString } from "@talismn/util"
import { assert, hexToU8a, u8aConcat, u8aToHex } from "@talismn/util"

export type SignPjsPayloadResult = {
  /** hex signature, MultiSignature-type-prefixed when the chain expects it */
  signature: HexString
  /** hex of the full signed extrinsic */
  signedTransaction: HexString
  /** bytes of the signed extrinsic, useful to compute the extrinsic hash */
  signedTransactionBytes: Uint8Array
}

type LookupFn = ReturnType<typeof parseMetadataRpc>["lookupFn"]

/**
 * Detects whether the chain's `ExtrinsicSignature` type is a `MultiSignature` enum, in which case
 * signatures must be prefixed with the signature-type byte.
 * Mirrors polkadot-js's auto-detection (and @polkadot-api/signers-common `getSignerType`).
 */
const getHasSignatureTypePrefix = (metadata: UnifiedMetadata, lookupFn: LookupFn): boolean => {
  const { extrinsic } = metadata
  let signatureTypeId: number | undefined
  if ("signature" in extrinsic && typeof extrinsic.signature === "number") {
    signatureTypeId = extrinsic.signature
  } else if ("type" in extrinsic && typeof extrinsic.type === "number") {
    signatureTypeId = metadata.lookup[extrinsic.type]?.params.find(
      (param) => param.name === "Signature"
    )?.type as number | undefined
  }
  assert(signatureTypeId !== undefined, "Unable to locate ExtrinsicSignature type in metadata")
  return lookupFn(signatureTypeId).type === "enum"
}

/**
 * Signs a `SignerPayloadJSON` and assembles the signed extrinsic, without polkadot-js.
 *
 * Byte-compatible with the previous polkadot-js flow:
 * `registry.createType("ExtrinsicPayload", payload).sign(pair)` + `Extrinsic.addSignature`.
 */
export const signPjsPayload = async (
  metadataRpc: HexString,
  payload: SignerPayloadJSON,
  secretKey: Uint8Array,
  curve: KeypairCurve,
  options?: {
    /** chaindata override forcing the signature type prefix on/off (LAOS signing quirk) */
    hasExtrinsicSignatureTypePrefix?: boolean
  }
): Promise<SignPjsPayloadResult> => {
  const { callData, extra, additionalSigned } = getPjsTxHelper(
    metadataRpc,
    CUSTOM_SIGNED_EXTENSIONS
  )(payload)

  // substrate signing rule: payloads over 256 bytes are blake2b-256 hashed before signing
  const fullPayload = u8aConcat(callData, extra, additionalSigned)
  const signingInput = fullPayload.length > 256 ? Blake2256(fullPayload) : fullPayload

  const rawSignature = signSubstrate(curve, secretKey, signingInput)

  const { unifiedMetadata, lookupFn } = parseMetadataRpc(metadataRpc)
  const withPrefix =
    options?.hasExtrinsicSignatureTypePrefix ?? getHasSignatureTypePrefix(unifiedMetadata, lookupFn)

  const prefix = SIGNATURE_TYPE_PREFIX[curve]
  assert(prefix !== undefined, `Unsupported curve: ${curve}`)
  const signature = withPrefix ? u8aConcat(new Uint8Array([prefix]), rawSignature) : rawSignature

  // reuse the already-computed tx parts and parsed metadata instead of assemblePjsTransaction,
  // which would re-parse the metadata blob
  const signedTransactionBytes = assembleFromParts(
    unifiedMetadata,
    payload,
    signature,
    extra,
    callData
  )

  return {
    signature: u8aToHex(signature),
    signedTransaction: u8aToHex(signedTransactionBytes),
    signedTransactionBytes,
  }
}

/** assembles the signed extrinsic from already-computed tx parts and parsed metadata */
const assembleFromParts = (
  unifiedMetadata: UnifiedMetadata,
  payload: SignerPayloadJSON,
  signatureBytes: Uint8Array,
  extra: Uint8Array,
  callData: Uint8Array
): Uint8Array =>
  // pass the final signature bytes and no signingType so createV4Tx embeds them verbatim
  createV4Tx(unifiedMetadata, getAddressBytes(payload.address), signatureBytes, [extra], callData)

/**
 * Assembles a signed extrinsic from a payload and a ready-made signature
 * (type-prefixed when the chain expects it — e.g. as returned by hardware/QR signers).
 * Byte-compatible with polkadot-js `Extrinsic.addSignature` + `toHex`.
 */
export const assemblePjsTransaction = (
  metadataRpc: HexString,
  payload: SignerPayloadJSON,
  signature: Uint8Array | HexString
): { signedTransaction: HexString; signedTransactionBytes: Uint8Array; hash: HexString } => {
  const { callData, extra } = getPjsTxHelper(metadataRpc, CUSTOM_SIGNED_EXTENSIONS)(payload)
  const { unifiedMetadata } = parseMetadataRpc(metadataRpc)

  const signatureBytes = typeof signature === "string" ? hexToU8a(signature) : signature

  const signedTransactionBytes = assembleFromParts(
    unifiedMetadata,
    payload,
    signatureBytes,
    extra,
    callData
  )

  return {
    signedTransaction: u8aToHex(signedTransactionBytes),
    signedTransactionBytes,
    hash: getSignedExtrinsicHash(signedTransactionBytes),
  }
}

/** Computes the hash of a signed extrinsic (blake2b-256 of its bytes) */
export const getSignedExtrinsicHash = (signedTransactionBytes: Uint8Array): HexString =>
  u8aToHex(blake2b256(signedTransactionBytes))
