import { toHex } from "@polkadot-api/utils"
import { beforeAll, describe, expect, it } from "vitest"

import { getParityFixture, getTestScaleApi } from "../__fixtures__/chains"
import type { SignerPayloadJSON } from "../pjsInterop"
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

const getPolkadot = () => getTestScaleApi("polkadot", { hasCheckMetadataHash: true }).chain

const run = (chain: Chain, payload: SignerPayloadJSON) =>
  getPayloadWithMetadataHash(chain, getChainInfo(chain), payload)

const IMMORTAL_PAYLOAD = getParityFixture("polkadot ed25519 immortal").payload

describe("getPayloadWithMetadataHash", () => {
  let immortal: ReturnType<typeof run>

  beforeAll(() => {
    immortal = run(getPolkadot(), IMMORTAL_PAYLOAD)
  })

  it("returns the payload untouched when the chain does not use CheckMetadataHash", () => {
    const payload = getParityFixture("polkadot ed25519 immortal").payload

    const result = run({ ...getPolkadot(), hasCheckMetadataHash: false }, payload)

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
    expect(immortal.payload).toEqual({
      ...IMMORTAL_PAYLOAD,
      mode: 1,
      metadataHash: "0x06760163466bbdb79e6c57ef330875d17f36d0a005b0d956cc171d833df1980a",
      withSignedTransaction: true,
    })
  })

  it("hashes the token and chain info into the metadata hash", () => {
    const twelveDecimals = run(
      { ...getPolkadot(), token: { symbol: "DOT", decimals: 12 } },
      IMMORTAL_PAYLOAD
    ).payload.metadataHash

    expect(twelveDecimals).toMatch(/^0x[0-9a-f]{64}$/)
    expect(twelveDecimals).not.toBe(immortal.payload.metadataHash)
  })

  it("returns a metadata proof ending with the chain's extra info", () => {
    const { txMetadata } = immortal

    expect(txMetadata && toHex(txMetadata).endsWith(POLKADOT_EXTRA_INFO)).toBe(true)
  })

  it("proves the types the extrinsic uses", () => {
    const mortal = run(
      getPolkadot(),
      getParityFixture("polkadot ed25519 mortal").payload
    ).txMetadata

    expect(immortal.txMetadata?.length).toBe(2027)
    expect(mortal?.length).toBe(2128)
  })
})
