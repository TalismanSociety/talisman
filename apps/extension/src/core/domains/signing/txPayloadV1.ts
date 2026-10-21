import {
  Bytes,
  compactBn,
  compactNumber,
  Option,
  Struct,
  u32,
} from "@polkadot-api/substrate-bindings"
import { fromHex, toHex } from "@polkadot-api/utils"
import {
  CUSTOM_SIGNED_EXTENSIONS,
  getTxHelper,
  type SignerPayloadJSON,
  toPjsHex,
} from "@talismn/sapi"
import { getSignedExtensions, parseMetadataRpc } from "@talismn/scale"
import type { HexString } from "@talismn/util"
import { assert } from "@talismn/util"
import { z } from "zod"

const hex = z
  .string()
  .regex(/^0x(?:[0-9a-fA-F]{2})*$/, "expected an even-length 0x-prefixed hex string")
  .transform((value) => value.toLowerCase() as HexString)

const hash = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "expected a 32-byte 0x-prefixed hex string")
  .transform((value) => value.toLowerCase() as HexString)

const txPayloadV1Schema = z.object({
  version: z.literal(1, "Unsupported payload version, expected 1"),
  signer: z.string(
    "Missing signer: Talisman has no account picker here, the dapp must name the signing account"
  ),
  callData: hex,
  extensions: z
    .array(z.object({ id: z.string(), extra: hex, additionalSigned: hex }))
    .superRefine((extensions, ctx) => {
      const ids = extensions.map(({ id }) => id)
      const duplicate = ids.find((id, index) => ids.indexOf(id) !== index)
      if (duplicate) ctx.addIssue({ code: "custom", message: `Duplicate extension ${duplicate}` })
    }),
  txExtVersion: z.union(
    [z.null(), z.literal(0)],
    "Unsupported txExtVersion: Talisman only creates v4 transactions (txExtVersion 0)"
  ),
  context: z.object({
    genesisHash: hash,
    bestBlockHeight: z.number().int().nonnegative(),
  }),
})

export type ParsedTxPayloadV1 = z.output<typeof txPayloadV1Schema>
export type TxExtension = ParsedTxPayloadV1["extensions"][number]

/**
 * Validates a dapp's `createTransaction` payload. `context.metadata` is dropped unread: only
 * metadata Talisman fetched from the chain decides what the user is shown.
 */
export const parseTxPayloadV1 = (payload: unknown): ParsedTxPayloadV1 => {
  const result = txPayloadV1Schema.safeParse(payload)
  if (result.success) return result.data

  const [issue] = result.error.issues
  throw new Error(`Invalid transaction payload: ${issue.message} (at ${issue.path.join(".")})`)
}

type PjsExtension = {
  toPayloadFields: (extension: TxExtension) => Partial<SignerPayloadJSON>
  /** no safe default exists, so the dapp must supply it when the chain uses it */
  required?: true
}

const assetTxPaymentDec = Struct({ tip: compactBn, asset: Option(Bytes(Infinity)) }).dec

/**
 * Extensions whose values `SignerPayloadJSON` carries as fields. The genesis hash comes from the
 * context instead, and `assertExtensionsMatch` holds the dapp's CheckGenesis bytes to it.
 */
const PJS_EXTENSIONS: Record<string, PjsExtension> = {
  CheckSpecVersion: {
    toPayloadFields: ({ additionalSigned }) => ({
      specVersion: toPjsHex(u32.dec(additionalSigned), 4),
    }),
  },
  CheckTxVersion: {
    toPayloadFields: ({ additionalSigned }) => ({
      transactionVersion: toPjsHex(u32.dec(additionalSigned), 4),
    }),
  },
  CheckNonce: {
    toPayloadFields: ({ extra }) => ({ nonce: toPjsHex(compactNumber.dec(extra), 4) }),
    required: true,
  },
  CheckMortality: {
    toPayloadFields: ({ extra, additionalSigned }) => ({ era: extra, blockHash: additionalSigned }),
    required: true,
  },
  ChargeTransactionPayment: {
    toPayloadFields: ({ extra }) => ({ tip: toPjsHex(compactBn.dec(extra), 16) }),
  },
  ChargeAssetTxPayment: {
    toPayloadFields: ({ extra }) => {
      const { tip, asset } = assetTxPaymentDec(extra)
      return { tip: toPjsHex(tip, 16), ...(asset ? { assetId: toHex(asset) as HexString } : {}) }
    },
  },
  CheckMetadataHash: {
    toPayloadFields: ({ extra, additionalSigned }) =>
      fromHex(extra)[0]
        ? { mode: 1, metadataHash: toHex(fromHex(additionalSigned).slice(1)) as HexString }
        : { mode: 0 },
  },
}

const unsupportedValue = (id: string) =>
  new Error(`Unsupported value for transaction extension ${id}`)

/**
 * Converts a `createTransaction` payload into the `SignerPayloadJSON` the signing pipeline
 * handles, without metadata so the sign popup opens straight away. Extensions the dapp omitted
 * get Talisman's own default. Approval runs `assertExtensionsMatch` once the metadata is loaded.
 */
export const signerPayloadFromTxPayloadV1 = (txPayload: ParsedTxPayloadV1): SignerPayloadJSON => {
  const fields: Partial<SignerPayloadJSON> = {}
  for (const extension of txPayload.extensions) {
    const pjsExtension = PJS_EXTENSIONS[extension.id]
    if (!pjsExtension) continue
    try {
      Object.assign(fields, pjsExtension.toPayloadFields(extension))
    } catch {
      throw unsupportedValue(extension.id)
    }
  }

  // the runtime the dapp built for, which decides the metadata Talisman decodes and signs with
  const { specVersion, transactionVersion } = fields
  assert(specVersion, "Missing transaction extension CheckSpecVersion")
  assert(transactionVersion, "Missing transaction extension CheckTxVersion")

  const { genesisHash, bestBlockHeight } = txPayload.context
  return {
    address: txPayload.signer,
    method: txPayload.callData,
    genesisHash,
    blockNumber: toPjsHex(bestBlockHeight, 4),
    // placeholders for chains without CheckMortality or CheckNonce, which are required otherwise
    blockHash: genesisHash,
    era: "0x00",
    nonce: toPjsHex(0, 4),
    tip: toPjsHex(0, 16),
    mode: 0,
    ...fields,
    specVersion,
    transactionVersion,
    signedExtensions: txPayload.extensions.map(({ id }) => id),
    version: 4,
    withSignedTransaction: true,
  }
}

/**
 * Rebuilds every extension from the converted payload with the chain's metadata and requires each
 * one the dapp supplied to match byte for byte. Approval may still turn on CheckMetadataHash, as
 * for any substrate sign.
 */
export const assertExtensionsMatch = (
  payload: SignerPayloadJSON,
  extensions: TxExtension[],
  metadataRpc: HexString
) => {
  const { unifiedMetadata } = parseMetadataRpc(metadataRpc)
  assert(
    unifiedMetadata.extrinsic.version.includes(4),
    "Unsupported chain: Talisman only creates v4 transactions"
  )

  const chainExtensionIds = getSignedExtensions(unifiedMetadata).map(({ identifier }) => identifier)
  const supplied = new Map(extensions.map((extension) => [extension.id, extension]))

  for (const id of supplied.keys())
    assert(chainExtensionIds.includes(id), `Unknown transaction extension ${id}`)
  for (const id of chainExtensionIds)
    assert(!PJS_EXTENSIONS[id]?.required || supplied.has(id), `Missing transaction extension ${id}`)

  const { input } = getTxHelper(metadataRpc, {
    customExtensionMappers: CUSTOM_SIGNED_EXTENSIONS,
  }).fromPjsToInputRaw(payload)

  for (const signed of input.extensions) {
    const requested = supplied.get(signed.id)
    if (!requested) continue
    if (toHex(signed.extra) !== requested.extra) throw unsupportedValue(signed.id)
    if (toHex(signed.additionalSigned) !== requested.additionalSigned)
      throw unsupportedValue(signed.id)
  }
}
