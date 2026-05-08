import { fromHex, mergeUint8 } from "@polkadot-api/utils"
import { AccountId } from "polkadot-api"
import { compact, u32 } from "scale-ts"

import type { SignerPayloadJSON } from "./signedPayloadTypes"

/**
 * Encode the signed extension "extra" and "additionalSigned" values from a SignerPayloadJSON.
 *
 * This replaces PJS's TypeRegistry + ExtrinsicPayload encoding with direct SCALE encoding
 * based on the well-known signed extension identifiers.
 */

// Mapping of signed extension identifier to { extra, additionalSigned } encoders.
// Each encoder takes the payload and returns SCALE-encoded bytes for that extension.
const SIGNED_EXTENSION_ENCODERS: Record<
  string,
  {
    extra: (payload: SignerPayloadJSON) => Uint8Array
    additionalSigned: (payload: SignerPayloadJSON) => Uint8Array
  }
> = {
  CheckSpecVersion: {
    extra: () => new Uint8Array(0),
    additionalSigned: (p) => u32.enc(Number.parseInt(p.specVersion.replace("0x", ""), 16)),
  },
  CheckTxVersion: {
    extra: () => new Uint8Array(0),
    additionalSigned: (p) => u32.enc(Number.parseInt(p.transactionVersion.replace("0x", ""), 16)),
  },
  CheckGenesis: {
    extra: () => new Uint8Array(0),
    additionalSigned: (p) => fromHex(p.genesisHash),
  },
  CheckMortality: {
    extra: (p) => fromHex(p.era),
    additionalSigned: (p) => fromHex(p.blockHash),
  },
  CheckEra: {
    // alias for CheckMortality on some chains
    extra: (p) => fromHex(p.era),
    additionalSigned: (p) => fromHex(p.blockHash),
  },
  CheckNonce: {
    extra: (p) => compact.enc(Number.parseInt(p.nonce.replace("0x", ""), 16)),
    additionalSigned: () => new Uint8Array(0),
  },
  ChargeTransactionPayment: {
    extra: (p) => compact.enc(BigInt(p.tip)),
    additionalSigned: () => new Uint8Array(0),
  },
  CheckMetadataHash: {
    extra: (p) => {
      const mode = (p as SignerPayloadJSON & { mode?: number }).mode ?? 0
      return new Uint8Array([mode])
    },
    additionalSigned: (p) => {
      const metadataHash = p.metadataHash
      if (!metadataHash || metadataHash === "0x00" || metadataHash === "0x") {
        return new Uint8Array([0]) // None
      }
      // Some(H256)
      return mergeUint8([new Uint8Array([1]), fromHex(metadataHash)])
    },
  },
  CheckAppId: {
    extra: (p) => {
      const appId = (p as SignerPayloadJSON & { appId?: number }).appId ?? 0
      return compact.enc(appId)
    },
    additionalSigned: () => new Uint8Array(0),
  },
  // ChargeAssetTxPayment: extra = tip (compact u128) + assetId (Option<u32>)
  ChargeAssetTxPayment: {
    extra: (p) => {
      const tip = compact.enc(BigInt(p.tip))
      const assetId = p.assetId
        ? mergeUint8([
            new Uint8Array([1]),
            u32.enc(Number.parseInt(p.assetId.replace("0x", ""), 16)),
          ])
        : new Uint8Array([0]) // None
      return mergeUint8([tip, assetId])
    },
    additionalSigned: () => new Uint8Array(0),
  },
  // PrevalidateAttests (Polkadot-specific, no extra or additional signed data we need)
  PrevalidateAttests: {
    extra: () => new Uint8Array(0),
    additionalSigned: () => new Uint8Array(0),
  },
}

// Fallback for unknown extensions — encode as empty (zero-length)
const EMPTY_ENCODER = {
  extra: () => new Uint8Array(0),
  additionalSigned: () => new Uint8Array(0),
}

/**
 * Encode an ExtrinsicPayload as bare SCALE bytes (no length prefix).
 * This is equivalent to PJS `registry.createType("ExtrinsicPayload", payload).toU8a(true)`.
 *
 * Structure: call || ...extra || ...additionalSigned
 */
export const encodeExtrinsicPayload = (payload: SignerPayloadJSON): Uint8Array => {
  const call = fromHex(payload.method)
  const extraParts: Uint8Array[] = []
  const additionalSignedParts: Uint8Array[] = []

  for (const ext of payload.signedExtensions) {
    const encoder = SIGNED_EXTENSION_ENCODERS[ext] ?? EMPTY_ENCODER
    extraParts.push(encoder.extra(payload))
    additionalSignedParts.push(encoder.additionalSigned(payload))
  }

  return mergeUint8([call, ...extraParts, ...additionalSignedParts])
}

/**
 * Encode a fake-signed extrinsic as SCALE bytes.
 * This is equivalent to PJS `registry.createType("Extrinsic", payload).signFake(...).toU8a(true)`.
 *
 * Structure: length-prefix || (version | 0x80) || address || signature || extra || call
 *
 * For fee estimation, the signature doesn't need to be valid — we use a zero-filled signature.
 */
export const encodeFakeSignedExtrinsic = (payload: SignerPayloadJSON): Uint8Array => {
  const call = fromHex(payload.method)
  const extraParts: Uint8Array[] = []

  for (const ext of payload.signedExtensions) {
    const encoder = SIGNED_EXTENSION_ENCODERS[ext] ?? EMPTY_ENCODER
    extraParts.push(encoder.extra(payload))
  }

  const extra = mergeUint8(extraParts)

  // Version byte: (version | 0x80) to indicate signed
  const version = new Uint8Array([payload.version | 0x80])

  // Address: MultiAddress::Id (0x00 prefix + 32-byte account ID)
  // payload.address is SS58-encoded — decode to raw 32-byte public key
  const accountId = AccountId().enc(payload.address)
  const signerAddress = mergeUint8([new Uint8Array([0x00]), accountId])

  // Fake signature: type prefix (0x01 = sr25519) + 64 zero bytes
  const fakeSignature = new Uint8Array(65)
  fakeSignature[0] = 0x01 // sr25519

  const body = mergeUint8([version, signerAddress, fakeSignature, extra, call])

  return body
}
