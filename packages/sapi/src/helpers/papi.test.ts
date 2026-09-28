import { toHex } from "@polkadot-api/utils"
import { describe, expect, it } from "vitest"

import { getAddressBytes, isEthereumAddress, mortal, toPjsHex } from "./papi"

const ALICE_SS58 = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const ALICE_POLKADOT_SS58 = "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5"
const ALICE_PUBLIC_KEY = "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"

describe("toPjsHex", () => {
  it("left-pads to the minimum byte length like polkadot-js", () => {
    expect(toPjsHex(5, 4)).toBe("0x00000005")
    expect(toPjsHex(2003000, 4)).toBe("0x001e9038")
    expect(toPjsHex(0, 16)).toBe("0x00000000000000000000000000000000")
  })

  it("pads odd-length values to whole bytes", () => {
    expect(toPjsHex(0xabc)).toBe("0x0abc")
    expect(toPjsHex(0)).toBe("0x00")
  })

  it("never truncates values longer than the minimum byte length", () => {
    expect(toPjsHex(0x0102030405, 4)).toBe("0x0102030405")
  })

  it("accepts bigints", () => {
    expect(toPjsHex(10_000_000_000n, 16)).toBe("0x000000000000000000000002540be400")
  })
})

// vectors from polkadot-sdk sp_runtime::generic::era tests
describe("mortal", () => {
  it("encodes a 64-block era (mortal_codec_works)", () => {
    expect(toHex(mortal({ period: 64, phase: 42 }))).toBe("0xa502")
  })

  it("quantises the phase of long eras (long_period_mortal_codec_works)", () => {
    expect(toHex(mortal({ period: 32768, phase: 20000 }))).toBe("0x4e9c")
  })

  it("encodes phase 0", () => {
    expect(toHex(mortal({ period: 64, phase: 0 }))).toBe("0x0500")
  })
})

describe("isEthereumAddress", () => {
  it("accepts 20-byte hex addresses in any case", () => {
    expect(isEthereumAddress("0x56377c0b855c204ae32ed48dffddc1e059076f04")).toBe(true)
    expect(isEthereumAddress("0x56377C0B855C204AE32ED48DFFDDC1E059076F04")).toBe(true)
  })

  it("rejects ss58 addresses, public keys and malformed hex", () => {
    expect(isEthereumAddress(ALICE_SS58)).toBe(false)
    expect(isEthereumAddress(ALICE_PUBLIC_KEY)).toBe(false)
    expect(isEthereumAddress("0x56377c0b855c204ae32ed48dffddc1e059076f0")).toBe(false)
    expect(isEthereumAddress("56377c0b855c204ae32ed48dffddc1e059076f04")).toBe(false)
  })
})

describe("getAddressBytes", () => {
  it("decodes ss58 addresses of any prefix to the public key", () => {
    expect(toHex(getAddressBytes(ALICE_SS58))).toBe(ALICE_PUBLIC_KEY)
    expect(toHex(getAddressBytes(ALICE_POLKADOT_SS58))).toBe(ALICE_PUBLIC_KEY)
  })

  it("decodes ethereum addresses to their 20 bytes", () => {
    expect(toHex(getAddressBytes("0x56377c0b855c204ae32ed48dffddc1e059076f04"))).toBe(
      "0x56377c0b855c204ae32ed48dffddc1e059076f04"
    )
  })

  it("throws on invalid addresses", () => {
    expect(() => getAddressBytes("not-an-address")).toThrow("Invalid address: not-an-address")
    expect(() => getAddressBytes(`${ALICE_SS58.slice(0, -1)}Z`)).toThrow(
      `Invalid address: ${ALICE_SS58.slice(0, -1)}Z`
    )
  })
})
