import { describe, expect, it } from "vitest"

import { getLegAlphaRate, parseDTaoLeg, parseDTaoTokenId } from "../dTaoLeg"

const TAO = "bittensor:substrate-native"
const SN64 = "bittensor:substrate-dtao:64"
const SN64_YUMA = `${SN64}:5Yuma`

describe("parseDTaoLeg", () => {
  it("reads a stake and its validator from the destination token", () => {
    expect(parseDTaoLeg(TAO, SN64_YUMA)).toEqual({
      networkId: "bittensor",
      netuid: 64,
      direction: "stake",
      hotkey: "5Yuma",
      dTaoTokenId: SN64_YUMA,
      taoTokenId: TAO,
    })
  })

  it("reads an unstake and its validator from the source token", () => {
    expect(parseDTaoLeg(SN64_YUMA, TAO)).toMatchObject({
      direction: "unstake",
      hotkey: "5Yuma",
      dTaoTokenId: SN64_YUMA,
    })
  })

  it("has no validator for a stake into a subnet's own token", () => {
    expect(parseDTaoLeg(TAO, SN64)?.hotkey).toBeNull()
  })

  it("is null for an unstake from a subnet's own token: there is no position to unstake", () => {
    expect(parseDTaoLeg(SN64, TAO)).toBeNull()
  })

  it("is null until both tokens are chosen", () => {
    expect(parseDTaoLeg(TAO, null)).toBeNull()
    expect(parseDTaoLeg(undefined, SN64_YUMA)).toBeNull()
  })

  it("is null for a leg that does not trade a subnet against its network's TAO", () => {
    expect(parseDTaoLeg(TAO, "964:evm-native")).toBeNull()
    expect(parseDTaoLeg("964:evm-native", SN64_YUMA)).toBeNull()
    expect(parseDTaoLeg(SN64_YUMA, `${SN64}:5Other`)).toBeNull()
    expect(parseDTaoLeg("bittensor-testnet:substrate-native", SN64_YUMA)).toBeNull()
  })
})

describe("getLegAlphaRate", () => {
  const stake = parseDTaoLeg(TAO, SN64_YUMA)
  const unstake = parseDTaoLeg(SN64_YUMA, TAO)
  if (!stake || !unstake) throw new Error("expected two dTAO legs")

  it("is the TAO traded per alpha, in rao, whichever way the leg goes", () => {
    expect(
      getLegAlphaRate(stake, { inputAmount: 1_000_000_000n, outputAmount: 50_000_000_000n })
    ).toBe(20_000_000n)
    expect(
      getLegAlphaRate(unstake, { inputAmount: 50_000_000_000n, outputAmount: 997_000_000n })
    ).toBe(19_940_000n)
  })

  it("is zero for a leg that moves no alpha", () => {
    expect(getLegAlphaRate(stake, { inputAmount: 1n, outputAmount: 0n })).toBe(0n)
  })
})

describe("parseDTaoTokenId", () => {
  it("reads the subnet and the validator of a position, and no validator of a subnet's own token", () => {
    expect(parseDTaoTokenId(SN64_YUMA)).toMatchObject({ netuid: 64, hotkey: "5Yuma" })
    expect(parseDTaoTokenId(SN64)?.hotkey).toBeUndefined()
  })

  it("is null for any other token, and for no token", () => {
    expect(parseDTaoTokenId(TAO)).toBeNull()
    expect(parseDTaoTokenId("not a token id")).toBeNull()
    expect(parseDTaoTokenId(null)).toBeNull()
  })
})
