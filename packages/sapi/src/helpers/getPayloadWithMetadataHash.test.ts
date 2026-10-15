import { toHex } from "@polkadot-api/utils"
import { describe, expect, it } from "vitest"

import { getParityFixture, getTestScaleApi } from "../__fixtures__/chains"
import { getChainInfo } from "./getChainInfo"
import { getPayloadWithMetadataHash } from "./getPayloadWithMetadataHash"
import type { Chain } from "./types"

const encodeString = (value: string) =>
  `${(value.length << 2).toString(16).padStart(2, "0")}${Buffer.from(value).toString("hex")}`

// RFC-0078 ExtraInfo, the trailing field of the metadata proof
const POLKADOT_EXTRA_INFO = [
  "38901e00", // spec_version 2003000
  encodeString("polkadot"),
  "0000", // base58_prefix 0
  "0a", // decimals 10
  encodeString("DOT"),
].join("")

const getPolkadot = (hasCheckMetadataHash = true) =>
  getTestScaleApi("polkadot", { hasCheckMetadataHash }).chain

const run = (chain: Chain, payload = getParityFixture("polkadot ed25519 immortal").payload) =>
  getPayloadWithMetadataHash(chain, getChainInfo(chain), payload)

describe("getPayloadWithMetadataHash", () => {
  it("returns the payload untouched when the chain does not use CheckMetadataHash", () => {
    const payload = getParityFixture("polkadot ed25519 immortal").payload

    const result = run(getPolkadot(false), payload)

    expect(result.payload).toBe(payload)
    expect(result.txMetadata).toBeUndefined()
  })

  it("returns the payload untouched when it does not sign CheckMetadataHash", () => {
    const payload = getParityFixture("polkadot ed25519 immortal").payload
    payload.signedExtensions = payload.signedExtensions.filter((e) => e !== "CheckMetadataHash")

    const result = run(getPolkadot(), payload)

    expect(result.payload).toBe(payload)
    expect(result.txMetadata).toBeUndefined()
  })

  it("returns the payload untouched when the metadata cannot be merkleized", () => {
    const payload = getParityFixture("polkadot ed25519 immortal").payload
    const chain = { ...getPolkadot(), hexMetadata: "0x6d657461" as const }

    const result = run(chain, payload)

    expect(result.payload).toBe(payload)
    expect(result.txMetadata).toBeUndefined()
  })

  it("enables mode 1 with the metadata hash and asks for the signed transaction", () => {
    const payload = getParityFixture("polkadot ed25519 immortal").payload

    const result = run(getPolkadot(), payload)

    expect(result.payload).toEqual({
      ...payload,
      mode: 1,
      metadataHash: "0x06760163466bbdb79e6c57ef330875d17f36d0a005b0d956cc171d833df1980a",
      withSignedTransaction: true,
    })
  })

  it("hashes the token and chain info into the metadata hash", () => {
    const chain = getPolkadot()

    const dot = run(chain).payload.metadataHash
    const twelveDecimals = run({ ...chain, token: { symbol: "DOT", decimals: 12 } }).payload
      .metadataHash

    expect(twelveDecimals).toMatch(/^0x[0-9a-f]{64}$/)
    expect(twelveDecimals).not.toBe(dot)
  })

  it("returns a metadata proof ending with the chain's extra info", () => {
    const { txMetadata } = run(getPolkadot())

    expect(txMetadata && toHex(txMetadata).endsWith(POLKADOT_EXTRA_INFO)).toBe(true)
  })

  it("proves the types the extrinsic uses", () => {
    const immortal = run(getPolkadot()).txMetadata
    const mortal = run(
      getPolkadot(),
      getParityFixture("polkadot ed25519 mortal").payload
    ).txMetadata

    expect(immortal?.length).toBe(2027)
    expect(mortal?.length).toBe(2128)
  })
})
