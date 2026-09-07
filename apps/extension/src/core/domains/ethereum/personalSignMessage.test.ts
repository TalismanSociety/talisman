import { stringToHex } from "viem"
import { describe, expect, it } from "vitest"

import {
  assertPersonalSignMessageDecodable,
  decodePersonalSignMessage,
} from "./personalSignMessage"

describe("decodePersonalSignMessage", () => {
  it("decodes a hex payload as utf-8", () => {
    expect(decodePersonalSignMessage(stringToHex("hello wörld"))).toBe("hello wörld")
  })

  it("returns a raw text payload unchanged", () => {
    expect(decodePersonalSignMessage("hello world")).toBe("hello world")
  })

  it("decodes an empty hex payload to an empty string", () => {
    expect(decodePersonalSignMessage("0x")).toBe("")
  })

  it("refuses an odd number of hex digits instead of guessing the padding side", () => {
    expect(decodePersonalSignMessage(`${stringToHex("ab")}6`)).toBeNull()
  })
})

describe("assertPersonalSignMessageDecodable", () => {
  it("accepts hex and text payloads", () => {
    expect(() => assertPersonalSignMessageDecodable(stringToHex("ok"))).not.toThrow()
    expect(() => assertPersonalSignMessageDecodable("ok")).not.toThrow()
  })

  it("rejects an odd-length hex payload as an invalid parameter", () => {
    expect(() => assertPersonalSignMessageDecodable("0x616")).toThrow(
      expect.objectContaining({ message: "Invalid parameter", code: -32602 })
    )
  })
})
