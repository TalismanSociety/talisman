import { describe, expect, it } from "vitest"
import type { SignerPayloadJSON } from "../../types/pjsInterop"
import {
  getEraBlocksLeftAt,
  getMevShieldDeadline,
  getMevShieldInnerPayload,
  isMevShieldWindowOpen,
} from "./helpers"

const payload: SignerPayloadJSON = {
  address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  blockHash: "0x1234",
  blockNumber: "0x00000064",
  era: "0x5500",
  genesisHash: "0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03",
  method: "0x0000",
  nonce: "0x0000000f",
  specVersion: "0x000001df",
  tip: "0x00000000000000000000000000000000",
  transactionVersion: "0x00000001",
  signedExtensions: ["CheckNonce", "CheckMetadataHash"],
  version: 4,
  mode: 1,
  metadataHash: "0xabcd",
}

describe("getMevShieldInnerPayload", () => {
  it("takes the next nonce, because the outer wrapper is applied first", () => {
    expect(BigInt(getMevShieldInnerPayload(payload).nonce)).toBe(16n)
  })

  it("keeps everything else the caller signs", () => {
    const { nonce: _, ...rest } = getMevShieldInnerPayload(payload)
    const { nonce: __, ...expected } = payload
    expect(rest).toEqual(expected)
  })
})

describe("getEraBlocksLeftAt", () => {
  it("counts down the 64 block era from the birth block", () => {
    expect(getEraBlocksLeftAt(payload, 100)).toBe(64)
    expect(getEraBlocksLeftAt(payload, 160)).toBe(4)
    expect(getEraBlocksLeftAt(payload, 170)).toBe(0)
  })
})

describe("MEV Shield window", () => {
  const shieldWindow = { headNumber: 1000, deadline: 71_000 }

  it("stays open until the author of N + 2 builds its block", () => {
    expect(isMevShieldWindowOpen(shieldWindow, 1000, 0)).toBe(true)
    expect(isMevShieldWindowOpen(shieldWindow, 1001, 0)).toBe(true)
    expect(isMevShieldWindowOpen(shieldWindow, 1002, 0)).toBe(false)
  })

  it("closes at its deadline, even when block N + 2 is late", () => {
    expect(isMevShieldWindowOpen(shieldWindow, 1001, 70_999)).toBe(true)
    expect(isMevShieldWindowOpen(shieldWindow, 1001, 71_000)).toBe(false)
  })

  it("ends 3 seconds before block N + 2 is due", () => {
    expect(getMevShieldDeadline(50_000, 12_000)).toBe(50_000 + 24_000 - 3_000)
  })
})
