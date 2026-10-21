import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import { decAnyMetadata, metadata as metadataCodec } from "@polkadot-api/substrate-bindings"
import { toHex } from "@polkadot-api/utils"
import { CUSTOM_SIGNED_EXTENSIONS, getPjsTxHelper } from "@talismn/sapi"
import type { HexString } from "@talismn/util"
import { describe, expect, it } from "vitest"

import {
  assertExtensionsMatch,
  parseTxPayloadV1,
  signerPayloadFromTxPayloadV1,
} from "./txPayloadV1"
import type { TxPayloadV1 } from "./types"

const ASSET_HUB_METADATA = `0x${gunzipSync(
  readFileSync(path.resolve(__dirname, "../../../../tests/fixtures/assethub-metadata-v15.scale.gz"))
).toString("hex")}` as HexString

const GENESIS_HASH = "0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f"
const BLOCK_HASH = "0xe1b1dda72998846487e4d858909d4f9a6bbd6e338e4588e5d809de16b1317b80"
const SIGNER = "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5"
// Balances.transfer_keep_alive(Id(SIGNER), 1 DOT)
const CALL_DATA =
  "0x0a0300d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d0700e40b5402"

// what papi's caller sends for every extension it fills, as SCALE hex
const EXTENSIONS = {
  AuthorizeCall: ["0x", "0x"],
  CheckNonZeroSender: ["0x", "0x"],
  CheckSpecVersion: ["0x", "0x39901e00"], // 2003001
  CheckTxVersion: ["0x", "0x0f000000"], // 15
  CheckGenesis: ["0x", GENESIS_HASH],
  CheckMortality: ["0x3601", BLOCK_HASH], // period 64
  CheckNonce: ["0x14", "0x"], // 5
  CheckWeight: ["0x", "0x"],
  ChargeAssetTxPayment: ["0x0000", "0x"], // no tip, native fee asset
  PrevalidateAttests: ["0x", "0x"],
  CheckMetadataHash: ["0x00", "0x00"], // disabled
  EthSetOrigin: ["0x", "0x"],
  StorageWeightReclaim: ["0x", "0x"],
} as const

const VOID_EXTENSIONS = [
  "AuthorizeCall",
  "CheckNonZeroSender",
  "CheckWeight",
  "PrevalidateAttests",
  "EthSetOrigin",
  "StorageWeightReclaim",
]

const toExtensions = (entries: Record<string, readonly [string, string]>) =>
  Object.entries(entries).map(([id, [extra, additionalSigned]]) => ({
    id,
    extra,
    additionalSigned,
  }))

const txPayload = (overrides: Partial<TxPayloadV1> = {}): TxPayloadV1 => ({
  version: 1,
  signer: SIGNER,
  callData: CALL_DATA,
  extensions: toExtensions(EXTENSIONS),
  txExtVersion: null,
  context: {
    metadata: "0x6d657461",
    token: { symbol: "DOT", decimals: 10 },
    bestBlockHeight: 7_000_100,
    bestBlockHash: BLOCK_HASH,
    genesisHash: GENESIS_HASH,
  },
  ...overrides,
})

// request time converts without metadata, approval checks the extensions once it is loaded
const convert = (txPayload: TxPayloadV1, metadataRpc = ASSET_HUB_METADATA) => {
  const parsed = parseTxPayloadV1(txPayload)
  const payload = signerPayloadFromTxPayloadV1(parsed)
  assertExtensionsMatch(payload, parsed.extensions, metadataRpc)
  return payload
}

const concatHex = (parts: string[]) => `0x${parts.map((part) => part.slice(2)).join("")}`

const concatExtensions = (entries: Record<string, readonly [string, string]>) => ({
  extra: concatHex(Object.values(entries).map(([extra]) => extra)),
  additionalSigned: concatHex(Object.values(entries).map(([, additional]) => additional)),
})

const signedParts = (metadataRpc: HexString, payload: ReturnType<typeof convert>) => {
  const { extra, additionalSigned } = getPjsTxHelper(metadataRpc, CUSTOM_SIGNED_EXTENSIONS)(payload)
  return { extra: toHex(extra), additionalSigned: toHex(additionalSigned) }
}

describe("signerPayloadFromTxPayloadV1", () => {
  it("converts a papi payload into the SignerPayloadJSON Talisman signs", () => {
    expect(convert(txPayload())).toEqual({
      address: SIGNER,
      method: CALL_DATA,
      genesisHash: GENESIS_HASH,
      blockHash: BLOCK_HASH,
      blockNumber: "0x006ad024",
      era: "0x3601",
      nonce: "0x00000005",
      tip: "0x00000000000000000000000000000000",
      specVersion: "0x001e9039",
      transactionVersion: "0x0000000f",
      mode: 0,
      signedExtensions: Object.keys(EXTENSIONS),
      version: 4,
      withSignedTransaction: true,
    })
  })

  it("signs the exact extension bytes the dapp supplied", () => {
    expect(signedParts(ASSET_HUB_METADATA, convert(txPayload()))).toEqual(
      concatExtensions(EXTENSIONS)
    )
  })

  it("fills the void extensions the dapp omitted", () => {
    const supplied = Object.fromEntries(
      Object.entries(EXTENSIONS).filter(([id]) => !VOID_EXTENSIONS.includes(id))
    )

    const payload = convert(txPayload({ extensions: toExtensions(supplied) }))

    expect(signedParts(ASSET_HUB_METADATA, payload)).toEqual(concatExtensions(EXTENSIONS))
  })

  it("keeps a supplied tip and fee asset", () => {
    // tip 1000, asset Some(location parents 1, Here)
    const entries = { ...EXTENSIONS, ChargeAssetTxPayment: ["0xa10f010100", "0x"] } as const

    const payload = convert(txPayload({ extensions: toExtensions(entries) }))

    expect(payload).toMatchObject({
      tip: "0x000000000000000000000000000003e8",
      assetId: "0x0100",
    })
    expect(signedParts(ASSET_HUB_METADATA, payload)).toEqual(concatExtensions(entries))
  })

  it.each([
    ["a void extension", "EthSetOrigin", ["0x00", "0x"]],
    ["the spec version", "CheckSpecVersion", ["0x", "0x38901e00"]],
    ["the transaction version", "CheckTxVersion", ["0x", "0x0e000000"]],
    ["the genesis hash", "CheckGenesis", ["0x", BLOCK_HASH]],
    ["an undecodable nonce", "CheckNonce", ["0x", "0x"]],
  ])("rejects a tampered value for %s", (_, id, value) => {
    const extensions = toExtensions({ ...EXTENSIONS, [id]: value as [string, string] })

    expect(() => convert(txPayload({ extensions }))).toThrow(
      `Unsupported value for transaction extension ${id}`
    )
  })

  it("rejects an extension the chain does not declare", () => {
    const extensions = toExtensions({ ...EXTENSIONS, AsScarcity: ["0x00", "0x"] })

    expect(() => convert(txPayload({ extensions }))).toThrow(
      "Unknown transaction extension AsScarcity"
    )
  })

  it.each(["CheckSpecVersion", "CheckTxVersion"])(
    "rejects a payload without %s before loading metadata",
    (id) => {
      const { [id as keyof typeof EXTENSIONS]: _, ...supplied } = EXTENSIONS
      const parsed = parseTxPayloadV1(txPayload({ extensions: toExtensions(supplied) }))

      expect(() => signerPayloadFromTxPayloadV1(parsed)).toThrow(
        `Missing transaction extension ${id}`
      )
    }
  )

  it.each(["CheckNonce", "CheckMortality"])("rejects a payload without %s", (id) => {
    const { [id as keyof typeof EXTENSIONS]: _, ...supplied } = EXTENSIONS

    expect(() => convert(txPayload({ extensions: toExtensions(supplied) }))).toThrow(
      `Missing transaction extension ${id}`
    )
  })

  describe("on a chain with an unknown Option-typed extension", () => {
    // Paseo Asset Hub's AsScarcity: papi's signPayload adapter refuses it, Talisman encodes None
    const withAsScarcity = (() => {
      const decoded = decAnyMetadata(ASSET_HUB_METADATA)
      if (decoded.metadata.tag !== "v15") throw new Error("expected v15 metadata")
      const { signedExtensions } = decoded.metadata.value.extrinsic
      const optionType = signedExtensions.find((e) => e.identifier === "CheckMetadataHash")
      const voidType = signedExtensions.find((e) => e.identifier === "AuthorizeCall")
      if (!optionType || !voidType) throw new Error("expected extensions missing")
      signedExtensions.push({
        identifier: "AsScarcity",
        type: optionType.additionalSigned,
        additionalSigned: voidType.additionalSigned,
      })
      return toHex(metadataCodec.enc(decoded)) as HexString
    })()

    it("signs it when the dapp supplies None", () => {
      const extensions = toExtensions({ ...EXTENSIONS, AsScarcity: ["0x00", "0x"] })

      const payload = convert(txPayload({ extensions }), withAsScarcity)

      expect(payload.signedExtensions.at(-1)).toBe("AsScarcity")
      expect(signedParts(withAsScarcity, payload)).toEqual(
        concatExtensions({ ...EXTENSIONS, AsScarcity: ["0x00", "0x"] })
      )
    })

    it("rejects any other value", () => {
      const extensions = toExtensions({
        ...EXTENSIONS,
        AsScarcity: [`0x01${"11".repeat(32)}`, "0x"],
      })

      expect(() => convert(txPayload({ extensions }), withAsScarcity)).toThrow(
        "Unsupported value for transaction extension AsScarcity"
      )
    })
  })
})

describe("parseTxPayloadV1", () => {
  it.each([
    [
      "a null signer",
      { signer: null },
      "Missing signer: Talisman has no account picker here, the dapp must name the signing account",
    ],
    [
      "a v5 extension version",
      { txExtVersion: 1 },
      "Unsupported txExtVersion: Talisman only creates v4 transactions (txExtVersion 0)",
    ],
    [
      "malformed call data",
      { callData: "0x0a0" },
      "expected an even-length 0x-prefixed hex string",
    ],
    [
      "a duplicate extension",
      { extensions: toExtensions(EXTENSIONS).concat(toExtensions({ CheckNonce: ["0x00", "0x"] })) },
      "Duplicate extension CheckNonce",
    ],
  ])("rejects %s", (_, overrides, message) => {
    expect(() => parseTxPayloadV1(txPayload(overrides as Partial<TxPayloadV1>))).toThrow(message)
  })

  it("accepts an explicit v4 extension version", () => {
    expect(parseTxPayloadV1(txPayload({ txExtVersion: 0 })).txExtVersion).toBe(0)
  })
})
