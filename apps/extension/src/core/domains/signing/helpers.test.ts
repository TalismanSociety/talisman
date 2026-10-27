import { u8aToHex, u8aWrapBytes } from "@talismn/util"
import { stringToHex } from "viem"
import { describe, expect, it } from "vitest"

import { isSignInDomainMismatch, parseSubstrateSignInMessage } from "./helpers"

describe("isSignInDomainMismatch", () => {
  it("matches the site host", () => {
    expect(isSignInDomainMismatch("example.com", "https://example.com/login")).toBe(false)
  })

  it("flags a foreign domain", () => {
    expect(isSignInDomainMismatch("evil.com", "https://example.com/login")).toBe(true)
  })

  it("compares the port too", () => {
    expect(isSignInDomainMismatch("localhost:5600", "http://localhost:5600/")).toBe(false)
    expect(isSignInDomainMismatch("localhost", "http://localhost:5600/")).toBe(true)
    expect(isSignInDomainMismatch("localhost:3000", "http://localhost:5600/")).toBe(true)
  })

  it("flags any domain against a url that cannot be parsed", () => {
    expect(isSignInDomainMismatch("example.com", "example.com")).toBe(true)
  })
})

const siwsMessage = (domain: string) =>
  [
    `${domain} wants you to sign in with your Substrate account:`,
    "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "",
    "URI: https://example.com",
    "Version: 1.0.0",
    "Nonce: abcdefgh12",
    "Issued At: 2024-01-01T00:00:00.000Z",
  ].join("\n")

describe("parseSubstrateSignInMessage", () => {
  it("reads the domain from raw text, hex and <Bytes>-wrapped hex alike", () => {
    const text = siwsMessage("evil.com")
    expect(parseSubstrateSignInMessage(text)?.domain).toBe("evil.com")
    expect(parseSubstrateSignInMessage(stringToHex(text))?.domain).toBe("evil.com")
    expect(parseSubstrateSignInMessage(u8aToHex(u8aWrapBytes(text)))?.domain).toBe("evil.com")
  })

  it("returns null for a message that is not a sign-in", () => {
    expect(parseSubstrateSignInMessage(stringToHex("just a plain message"))).toBeNull()
    expect(parseSubstrateSignInMessage("0x1234")).toBeNull()
  })
})
