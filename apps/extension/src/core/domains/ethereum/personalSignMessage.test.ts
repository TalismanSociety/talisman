import { stringToHex } from "viem"
import { describe, expect, it } from "vitest"

import { decodePersonalSignMessage, decodePersonalSignMessageOrThrow } from "./personalSignMessage"

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

describe("decodePersonalSignMessageOrThrow", () => {
  it("decodes hex and text payloads", () => {
    expect(decodePersonalSignMessageOrThrow(stringToHex("ok"))).toBe("ok")
    expect(decodePersonalSignMessageOrThrow("ok")).toBe("ok")
  })

  it("rejects an odd-length hex payload as an invalid parameter", () => {
    expect(() => decodePersonalSignMessageOrThrow("0x616")).toThrow(
      expect.objectContaining({ message: "Invalid parameter", code: -32602 })
    )
  })
})
