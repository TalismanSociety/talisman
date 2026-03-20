import {
  Bin,
  compactNumber,
  createDecoder,
  type Decoder,
  enhanceDecoder,
  extrinsicFormat,
  type StringRecord,
  Struct,
  u8,
} from "@polkadot-api/substrate-bindings"

import type { DecodedCall } from "../types"
import type { Chain } from "./types"

const allBytesDec = Bin(Infinity).dec

/**
 * Decodes a signed extrinsic and extracts the call data.
 * Handles different metadata versions (v14, v15, v16) and extrinsic formats.
 *
 * @param chain - The chain context with metadata and builder
 * @param extrinsicHex - The hex-encoded extrinsic (with 0x prefix)
 * @returns The decoded call with pallet, method, and args, or null if decoding fails
 */
export const getDecodedCallFromExtrinsic = <Res extends DecodedCall>(
  chain: Chain,
  extrinsicHex: `0x${string}`
): Res | null => {
  try {
    const { metadata, builder } = chain

    // Build decoder for signed extensions (extra field)
    // signedExtensions is keyed by extension version, 0 is the default
    const extensionsArray = metadata.extrinsic.signedExtensions[0] ?? []
    const extraDec = Struct.dec(
      Object.fromEntries(
        extensionsArray.map((x) => [x.identifier, builder.buildDefinition(x.type)[1]])
      ) as StringRecord<Decoder<unknown>>
    )

    // Build call decoder
    let callDec: Decoder<{ type: string; value: { type: string; value: unknown } }>
    const { extrinsic } = metadata
    if ("address" in extrinsic) {
      // v15/v16 metadata
      callDec = builder.buildDefinition(extrinsic.call)[1]
    } else {
      // v14 metadata
      const params = metadata.lookup[extrinsic.type]?.params
      const callType = params?.find((v) => v.name === "Call")?.type
      if (callType == null) throw new Error("Call type not found in metadata")
      callDec = builder.buildDefinition(callType)[1]
    }

    // Build address and signature decoders
    let addressDec: Decoder<unknown>
    let signatureDec: Decoder<unknown>
    if ("address" in extrinsic) {
      // v15/v16
      addressDec = builder.buildDefinition(extrinsic.address)[1]
      signatureDec = builder.buildDefinition(extrinsic.signature)[1]
    } else {
      // v14
      const params = metadata.lookup[extrinsic.type]?.params
      const addrType = params?.find((v) => v.name === "Address")?.type
      const sigType = params?.find((v) => v.name === "Signature")?.type
      if (addrType == null || sigType == null)
        throw new Error("Address or Signature type not found")
      addressDec = builder.buildDefinition(addrType)[1]
      signatureDec = builder.buildDefinition(sigType)[1]
    }

    // Build full signed extrinsic body decoder
    const v4Body = Struct.dec({
      address: addressDec,
      signature: signatureDec,
      extra: extraDec,
      callData: allBytesDec,
    })

    // Create the full extrinsic decoder
    const extrinsicDecoder = enhanceDecoder(
      createDecoder((data) => {
        const len = compactNumber.dec(data)
        const { type, version } = extrinsicFormat[1](data)

        if (type === "bare") {
          return { len, version, type, callData: allBytesDec(data) }
        }
        if (type === "signed") {
          return { len, version, type, ...v4Body(data) }
        }

        // v5 general format
        const extensionVersion = u8.dec(data)
        const extra = extraDec(data)
        return {
          len,
          type,
          version,
          extensionVersion,
          extra,
          callData: allBytesDec(data),
        }
      }),
      (v) => ({
        ...v,
        call: callDec(v.callData.asBytes()),
      })
    )

    // Decode the extrinsic
    const decoded = extrinsicDecoder(extrinsicHex)

    return {
      pallet: decoded.call.type,
      method: decoded.call.value.type,
      args: decoded.call.value.value,
    } as Res
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: troubleshoting
    console.error("[SAPI] Failed to decode extrinsic:", err)
    return null
  }
}
