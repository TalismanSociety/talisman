import { describe, expect, it } from "vitest"

import { parseTokenId } from "../utils"
import { parseSubGammaTokenId, SubGammaTokenSchema, subGammaTokenId } from "./SubstrateGammaToken"

describe("subGammaTokenId", () => {
  it.each([
    [0, "bittensor:substrate-gamma:0"],
    [25, "bittensor:substrate-gamma:25"],
    [65535, "bittensor:substrate-gamma:65535"],
  ])("round trips netuid %i", (netuid, id) => {
    expect(subGammaTokenId("bittensor", netuid)).toBe(id)
    expect(parseSubGammaTokenId(id)).toEqual({
      type: "substrate-gamma",
      networkId: "bittensor",
      netuid,
    })
    expect(parseTokenId(id)).toEqual({ type: "substrate-gamma", networkId: "bittensor", netuid })
  })
})

describe("parseSubGammaTokenId", () => {
  it("rejects a negative netuid", () => {
    expect(() => parseSubGammaTokenId("bittensor:substrate-gamma:-1")).toThrow(
      "Too small: expected number to be >=0"
    )
  })

  it("rejects another token type", () => {
    expect(() => parseSubGammaTokenId("bittensor:substrate-dtao:25")).toThrow(
      "Invalid SubGammaToken type: substrate-dtao"
    )
  })

  it("rejects an id without a netuid", () => {
    expect(() => parseSubGammaTokenId("bittensor:substrate-gamma")).toThrow(
      "Invalid SubGammaToken ID: bittensor:substrate-gamma"
    )
  })
})

describe("SubGammaTokenSchema", () => {
  const token = {
    id: "bittensor:substrate-gamma:25",
    networkId: "bittensor",
    type: "substrate-gamma",
    platform: "polkadot",
    decimals: 9,
    symbol: "GAMMA",
    netuid: 25,
  }

  it("defaults isTransferable to false", () => {
    expect(SubGammaTokenSchema.parse(token)).toEqual({ ...token, isTransferable: false })
  })

  it("rejects a negative netuid", () => {
    expect(SubGammaTokenSchema.safeParse({ ...token, netuid: -1 }).success).toBe(false)
  })

  it("rejects a hotkey", () => {
    expect(SubGammaTokenSchema.safeParse({ ...token, hotkey: "5Fo2" }).success).toBe(false)
  })
})
