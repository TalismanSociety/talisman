import { stringToHex } from "viem"
import { describe, expect, it } from "vitest"

import { isSiweDomainMismatch } from "./siwe"

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
