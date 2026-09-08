import { stringToHex } from "viem"
import { describe, expect, it } from "vitest"

import { isSiweDomainMismatch, parseSiweMessage } from "./siwe"

// minimal valid EIP-4361 message for the given domain
const siweMessage = (domain: string) =>
  [
    `${domain} wants you to sign in with your Ethereum account:`,
    "0x0000000000000000000000000000000000000000",
    "",
    "Sign in.",
    "",
    `URI: https://${domain}/`,
    "Version: 1",
    "Chain ID: 1",
    "Nonce: 12345678",
    "Issued At: 2021-09-30T16:25:24.000Z",
  ].join("\n")

const hex = (text: string) => stringToHex(text)

describe("isSiweDomainMismatch", () => {
  it("returns false when the SIWE domain matches the site hostname", () => {
    expect(
      isSiweDomainMismatch(
        "personal_sign",
        hex(siweMessage("example.com")),
        "https://example.com/login"
      )
    ).toBe(false)
  })

  it("returns true when the SIWE domain differs from the site hostname", () => {
    expect(
      isSiweDomainMismatch(
        "personal_sign",
        hex(siweMessage("evil.com")),
        "https://example.com/login"
      )
    ).toBe(true)
  })

  it("detects the domain of a SIWE message sent as raw text", () => {
    expect(
      isSiweDomainMismatch("personal_sign", siweMessage("evil.com"), "https://example.com/login")
    ).toBe(true)
  })

  it("returns false for a non-SIWE personal_sign message", () => {
    expect(
      isSiweDomainMismatch("personal_sign", hex("just a plain message"), "https://example.com")
    ).toBe(false)
  })

  it("returns false for a non personal_sign method", () => {
    expect(
      isSiweDomainMismatch(
        "eth_signTypedData_v4",
        hex(siweMessage("evil.com")),
        "https://example.com"
      )
    ).toBe(false)
  })

  it("returns false when method, message or url is missing", () => {
    expect(
      isSiweDomainMismatch(undefined, hex(siweMessage("evil.com")), "https://example.com")
    ).toBe(false)
    expect(isSiweDomainMismatch("personal_sign", undefined, "https://example.com")).toBe(false)
    expect(isSiweDomainMismatch("personal_sign", hex(siweMessage("evil.com")), undefined)).toBe(
      false
    )
  })
})

describe("parseSiweMessage", () => {
  it("parses hex and raw text SIWE messages to the same domain", () => {
    expect(parseSiweMessage(hex(siweMessage("example.com")))?.domain).toBe("example.com")
    expect(parseSiweMessage(siweMessage("example.com"))?.domain).toBe("example.com")
  })

  it("returns null for an odd-length hex payload, so no surface treats it as a sign-in", () => {
    expect(parseSiweMessage(`${hex(siweMessage("evil.com"))}0`)).toBeNull()
  })

  it("returns null for a non-SIWE message", () => {
    expect(parseSiweMessage(hex("just a plain message"))).toBeNull()
    expect(parseSiweMessage(undefined)).toBeNull()
  })
})
