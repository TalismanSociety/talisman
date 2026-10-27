import { u8aToHex, u8aWrapBytes } from "@talismn/util"
import { stringToHex } from "viem"
import { describe, expect, it } from "vitest"

import {
  decodeSubstrateRawMessage,
  getSignInDomains,
  isSignInDomainMismatch,
  parseSubstrateSignInMessage,
} from "./helpers"

const signInMessage = (domain: string, platform: string, address: string) =>
  [
    `${domain} wants you to sign in with your ${platform} account:`,
    address,
    "",
    "Sign in.",
    "",
    `URI: https://${domain}`,
    "Version: 1",
    "Nonce: abcdefgh12",
    "Issued At: 2024-01-01T00:00:00.000Z",
  ].join("\n")

const siwe = (domain: string) =>
  signInMessage(domain, "Ethereum", "0x5Bc1B6eBbBd7E5DdA1Fd0aB9C9D6dCd2bA7d0E0d")
const siwsSubstrate = (domain: string) =>
  signInMessage(domain, "Substrate", "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
const siwsSolana = (domain: string) =>
  signInMessage(domain, "Solana", "7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv")

describe("getSignInDomains", () => {
  it("reads the domain of each platform's canonical header", () => {
    expect(getSignInDomains(siwe("victim.example"))).toEqual(["victim.example"])
    expect(getSignInDomains(siwsSubstrate("victim.example"))).toEqual(["victim.example"])
    expect(getSignInDomains(siwsSolana("victim.example"))).toEqual(["victim.example"])
  })

  it("reads variants that strict parsers reject", () => {
    expect(getSignInDomains(`${siwe("victim.example")}\n`)).toEqual(["victim.example"])
    expect(
      getSignInDomains(siwe("victim.example").replace("Sign in.", "Connexion ✓ 日本"))
    ).toEqual(["victim.example"])
    expect(getSignInDomains(siwe("victim.example").replaceAll("\n", "\r\n"))).toEqual([
      "victim.example",
    ])
    expect(getSignInDomains(`﻿  ${siwe("victim.example")}`)).toEqual(["victim.example"])
  })

  it("drops a scheme prefix and lowercases the domain", () => {
    expect(getSignInDomains(siwe("https://Victim.Example"))).toEqual(["victim.example"])
    expect(getSignInDomains(siwe("VICTIM.EXAMPLE:8443"))).toEqual(["victim.example:8443"])
  })

  it("reads a header that is not on the first line", () => {
    expect(getSignInDomains(`Welcome!\n\n${siwe("victim.example")}`)).toEqual(["victim.example"])
  })

  it("reads every header of a message", () => {
    expect(getSignInDomains(`${siwe("site.example")}\n\n${siwsSolana("victim.example")}`)).toEqual([
      "site.example",
      "victim.example",
    ])
  })

  it("finds no domain in plain text", () => {
    expect(getSignInDomains("victim.example is not a sign-in")).toEqual([])
    expect(getSignInDomains("please sign in with your Ethereum account")).toEqual([])
  })
})

describe("isSignInDomainMismatch", () => {
  it("matches the site host", () => {
    expect(isSignInDomainMismatch(siwe("example.com"), "https://example.com/login")).toBe(false)
    expect(isSignInDomainMismatch(siwe("https://Example.com"), "https://example.com/")).toBe(false)
  })

  it("flags a foreign domain", () => {
    expect(isSignInDomainMismatch(siwe("evil.com"), "https://example.com/login")).toBe(true)
  })

  it("compares the port too", () => {
    expect(isSignInDomainMismatch(siwe("localhost:5600"), "http://localhost:5600/")).toBe(false)
    expect(isSignInDomainMismatch(siwe("localhost"), "http://localhost:5600/")).toBe(true)
    expect(isSignInDomainMismatch(siwe("localhost:3000"), "http://localhost:5600/")).toBe(true)
  })

  it("flags a message when any of its headers names a foreign domain", () => {
    expect(
      isSignInDomainMismatch(
        `${siwe("example.com")}\n\n${siwe("evil.com")}`,
        "https://example.com/login"
      )
    ).toBe(true)
  })

  it("does not flag plain text", () => {
    expect(isSignInDomainMismatch("evil.com is not a sign-in", "https://example.com")).toBe(false)
  })

  it("flags a sign-in against a url that cannot be parsed", () => {
    expect(isSignInDomainMismatch(siwe("example.com"), "example.com")).toBe(true)
  })
})

describe("decodeSubstrateRawMessage", () => {
  it("decodes raw text, hex and <Bytes>-wrapped hex to the same text", () => {
    const text = siwsSubstrate("evil.com")
    expect(decodeSubstrateRawMessage(text)).toBe(text)
    expect(decodeSubstrateRawMessage(stringToHex(text))).toBe(text)
    expect(decodeSubstrateRawMessage(u8aToHex(u8aWrapBytes(text)))).toBe(text)
  })
})

describe("parseSubstrateSignInMessage", () => {
  it("parses a sign-in message", () => {
    const message = siwsSubstrate("evil.com").replace("Version: 1", "Version: 1.0.0")
    expect(parseSubstrateSignInMessage(message)?.domain).toBe("evil.com")
  })

  it("returns null for a message that is not a sign-in", () => {
    expect(parseSubstrateSignInMessage("just a plain message")).toBeNull()
  })
})
