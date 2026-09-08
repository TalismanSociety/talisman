import { bytesToHex } from "@noble/hashes/utils.js"
import { describe, expect, it } from "vitest"

import {
  frontierH160ToAccountId32,
  frontierH160ToSs58Mirror,
  frontierSs58ToPublicKeyHex,
} from "./frontierEvmMirror"

// vectors verified on Bittensor mainnet against the addressMapping precompile (0x...080C)
const VECTORS = [
  {
    h160: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    accountId32: "c4518fa0ed143e016e4a1410193704924b890de8f854b94c7a6037651ec65dd0",
    ss58: "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu",
  },
  {
    h160: "0x0000000000000000000000000000000000000800",
    accountId32: "07ec712a5d38434ddd033f8f024ecdfc4bb5951c13c3085c399c8a5f6293705d",
    ss58: "5CF6Ruq6u7DoF6TYxyaFzEuviWi7tjvJtz19XgPS2b7XDCFM",
  },
  {
    h160: "0x0000000000000000000000000000000000000000",
    accountId32: "c2cdcf01af7163d2d99b2ec87954e4c1b735e9e9ea80f8775bf29dd9457eaca1",
    ss58: "5GU8HU4cLcmjpoXLNxWAHYViwbTQggdqd7ykp99CSWGbsZHG",
  },
]

describe("frontierH160ToAccountId32", () => {
  it.each(VECTORS)("hashes evm: prefix and address for $h160", ({ h160, accountId32 }) => {
    expect(bytesToHex(frontierH160ToAccountId32(h160))).toEqual(accountId32)
  })

  it("is case insensitive", () => {
    const { h160 } = VECTORS[0]!
    expect(frontierH160ToAccountId32(h160)).toEqual(frontierH160ToAccountId32(h160.toLowerCase()))
  })

  it("rejects non H160 input", () => {
    expect(() =>
      frontierH160ToAccountId32("5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu")
    ).toThrow("Invalid H160 address")
    expect(() => frontierH160ToAccountId32("0x1234")).toThrow("Invalid H160 address")
  })
})

describe("frontierH160ToSs58Mirror", () => {
  it.each(VECTORS)("encodes the mirror of $h160 with prefix 42", ({ h160, ss58 }) => {
    expect(frontierH160ToSs58Mirror(h160)).toEqual(ss58)
    expect(frontierH160ToSs58Mirror(h160, 42)).toEqual(ss58)
  })

  it("honours the ss58 prefix", () => {
    const { h160, ss58 } = VECTORS[0]!
    const polkadotMirror = frontierH160ToSs58Mirror(h160, 0)
    expect(polkadotMirror).not.toEqual(ss58)
    expect(frontierSs58ToPublicKeyHex(polkadotMirror)).toEqual(frontierSs58ToPublicKeyHex(ss58))
  })
})

describe("frontierSs58ToPublicKeyHex", () => {
  it.each(VECTORS)("returns the 32-byte public key of $ss58", ({ accountId32, ss58 }) => {
    expect(frontierSs58ToPublicKeyHex(ss58)).toEqual(`0x${accountId32}`)
  })

  it("rejects invalid addresses", () => {
    expect(() => frontierSs58ToPublicKeyHex("not-an-address")).toThrow()
  })
})
