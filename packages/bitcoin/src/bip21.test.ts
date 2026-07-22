import { describe, expect, it } from "vitest"

import { encodeBip21Uri, parseBip21Uri } from "./bip21"

const ADDRESS = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"

describe("parseBip21Uri", () => {
  it("parses a bare address uri", () => {
    expect(parseBip21Uri(`bitcoin:${ADDRESS}`)).toEqual({ address: ADDRESS })
  })

  it("is case-insensitive on the scheme", () => {
    expect(parseBip21Uri(`BITCOIN:${ADDRESS}`)).toEqual({ address: ADDRESS })
  })

  it("parses amount as exact sats", () => {
    expect(parseBip21Uri(`bitcoin:${ADDRESS}?amount=0.00001`)).toEqual({
      address: ADDRESS,
      amountSats: 1_000n,
    })
    expect(parseBip21Uri(`bitcoin:${ADDRESS}?amount=20.3`)).toEqual({
      address: ADDRESS,
      amountSats: 2_030_000_000n,
    })
    expect(parseBip21Uri(`bitcoin:${ADDRESS}?amount=1`)).toEqual({
      address: ADDRESS,
      amountSats: 100_000_000n,
    })
  })

  it("parses label and message", () => {
    expect(
      parseBip21Uri(`bitcoin:${ADDRESS}?label=Luke-Jr&message=Donation%20for%20project`)
    ).toEqual({
      address: ADDRESS,
      label: "Luke-Jr",
      message: "Donation for project",
    })
  })

  it("rejects invalid amounts", () => {
    expect(parseBip21Uri(`bitcoin:${ADDRESS}?amount=abc`)).toBeNull()
    expect(parseBip21Uri(`bitcoin:${ADDRESS}?amount=0.000000001`)).toBeNull() // > 8 decimals
    expect(parseBip21Uri(`bitcoin:${ADDRESS}?amount=0`)).toBeNull()
    expect(parseBip21Uri(`bitcoin:${ADDRESS}?amount=-1`)).toBeNull()
  })

  it("rejects unknown required parameters per BIP21", () => {
    expect(parseBip21Uri(`bitcoin:${ADDRESS}?req-somethingyoudontunderstand=50`)).toBeNull()
  })

  it("ignores unknown optional parameters", () => {
    expect(parseBip21Uri(`bitcoin:${ADDRESS}?somethingyoudontunderstand=50`)).toEqual({
      address: ADDRESS,
    })
  })

  it("returns null for non-bip21 strings", () => {
    expect(parseBip21Uri(ADDRESS)).toBeNull()
    expect(parseBip21Uri("ethereum:0x123")).toBeNull()
    expect(parseBip21Uri("")).toBeNull()
  })
})

describe("encodeBip21Uri", () => {
  it("encodes a bare address", () => {
    expect(encodeBip21Uri({ address: ADDRESS })).toEqual(`bitcoin:${ADDRESS}`)
  })

  it("encodes amounts as exact btc decimals", () => {
    expect(encodeBip21Uri({ address: ADDRESS, amountSats: 1_000n })).toEqual(
      `bitcoin:${ADDRESS}?amount=0.00001`
    )
    expect(encodeBip21Uri({ address: ADDRESS, amountSats: 2_030_000_000n })).toEqual(
      `bitcoin:${ADDRESS}?amount=20.3`
    )
  })

  it("round-trips through parse", () => {
    const uri = encodeBip21Uri({ address: ADDRESS, amountSats: 123_456_789n, label: "tip" })
    expect(parseBip21Uri(uri)).toEqual({
      address: ADDRESS,
      amountSats: 123_456_789n,
      label: "tip",
    })
  })
})
