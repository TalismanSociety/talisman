import { describe, expect, it } from "vitest"
import { normalizeAddress } from "../normalizeAddress"
import { isBitcoinAddress, isBitcoinOnChainAddress } from "./bitcoin"
import {
  deriveBitcoinAddressFromXpub,
  encodeXpubForDisplay,
  getXpubPrefix,
  isBitcoinXpub,
  normalizeXpub,
} from "./bitcoinXpub"
import { detectAddressEncoding } from "./detectAddressEncoding"

// BIP84 / BIP86 account-level keys for the standard test mnemonic
const BIP84_ZPUB =
  "zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs"
const BIP86_XPUB =
  "xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ"

const GENESIS_P2PKH = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
const P2WPKH = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"
const P2TR = "bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr"

describe("isBitcoinXpub / normalizeXpub", () => {
  it("detects extended public keys of all SLIP-132 flavors", () => {
    expect(isBitcoinXpub(BIP86_XPUB)).toBe(true)
    expect(isBitcoinXpub(BIP84_ZPUB)).toBe(true)
  })

  it("does not match on-chain addresses", () => {
    expect(isBitcoinXpub(GENESIS_P2PKH)).toBe(false)
    expect(isBitcoinXpub(P2WPKH)).toBe(false)
    expect(isBitcoinXpub(P2TR)).toBe(false)
  })

  it("normalizes zpub to canonical xpub version bytes", () => {
    const normalized = normalizeXpub(BIP84_ZPUB)
    expect(normalized.startsWith("xpub")).toBe(true)
    expect(isBitcoinXpub(normalized)).toBe(true)
  })

  it("is idempotent on plain xpubs", () => {
    expect(normalizeXpub(BIP86_XPUB)).toEqual(BIP86_XPUB)
  })
})

describe("getXpubPrefix / encodeXpubForDisplay", () => {
  it("detects the SLIP-132 prefix", () => {
    expect(getXpubPrefix(BIP84_ZPUB)).toEqual("zpub")
    expect(getXpubPrefix(BIP86_XPUB)).toEqual("xpub")
  })

  it("round-trips a zpub through the canonical form", () => {
    expect(encodeXpubForDisplay(normalizeXpub(BIP84_ZPUB), "p2wpkh")).toEqual(BIP84_ZPUB)
  })

  it("keeps taproot keys as plain xpub", () => {
    expect(encodeXpubForDisplay(BIP86_XPUB, "p2tr")).toEqual(BIP86_XPUB)
  })

  it("uses testnet prefixes for signet", () => {
    expect(encodeXpubForDisplay(BIP84_ZPUB, "p2wpkh", "tb").startsWith("vpub")).toBe(true)
    expect(encodeXpubForDisplay(BIP86_XPUB, "p2tr", "tb").startsWith("tpub")).toBe(true)
  })

  it("display encoding derives the same addresses as the canonical form", () => {
    const zpub = encodeXpubForDisplay(normalizeXpub(BIP84_ZPUB), "p2wpkh")
    expect(deriveBitcoinAddressFromXpub(zpub, "p2wpkh", 0, 0)).toEqual(P2WPKH)
  })
})

describe("detectAddressEncoding / normalizeAddress with xpubs", () => {
  it("detects bip32-xpub encoding", () => {
    expect(detectAddressEncoding(BIP86_XPUB)).toEqual("bip32-xpub")
    expect(detectAddressEncoding(BIP84_ZPUB)).toEqual("bip32-xpub")
  })

  it("still detects on-chain bitcoin addresses", () => {
    expect(detectAddressEncoding(P2WPKH)).toEqual("bech32")
    expect(detectAddressEncoding(P2TR)).toEqual("bech32m")
    expect(detectAddressEncoding(GENESIS_P2PKH)).toEqual("base58check")
  })

  it("still detects other platforms", () => {
    expect(detectAddressEncoding("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toEqual("ethereum")
    expect(detectAddressEncoding("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")).toEqual(
      "ss58"
    )
    expect(detectAddressEncoding("oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96")).toEqual(
      "base58solana"
    )
  })

  it("normalizeAddress canonicalizes xpubs", () => {
    expect(normalizeAddress(BIP84_ZPUB)).toEqual(normalizeXpub(BIP84_ZPUB))
    expect(normalizeAddress(BIP86_XPUB)).toEqual(BIP86_XPUB)
  })
})

describe("isBitcoinAddress vs isBitcoinOnChainAddress", () => {
  it("isBitcoinAddress matches both addresses and xpubs", () => {
    expect(isBitcoinAddress(P2WPKH)).toBe(true)
    expect(isBitcoinAddress(BIP86_XPUB)).toBe(true)
  })

  it("isBitcoinOnChainAddress rejects xpubs", () => {
    expect(isBitcoinOnChainAddress(P2WPKH)).toBe(true)
    expect(isBitcoinOnChainAddress(P2TR)).toBe(true)
    expect(isBitcoinOnChainAddress(BIP86_XPUB)).toBe(false)
  })
})

describe("deriveBitcoinAddressFromXpub", () => {
  it("derives P2WPKH addresses from a SLIP-132 zpub", () => {
    expect(deriveBitcoinAddressFromXpub(BIP84_ZPUB, "p2wpkh", 0, 0)).toEqual(P2WPKH)
    expect(deriveBitcoinAddressFromXpub(BIP84_ZPUB, "p2wpkh", 0, 1)).toEqual(
      "bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g"
    )
    expect(deriveBitcoinAddressFromXpub(BIP84_ZPUB, "p2wpkh", 1, 0)).toEqual(
      "bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el"
    )
  })

  it("derives P2TR addresses from an xpub", () => {
    expect(deriveBitcoinAddressFromXpub(BIP86_XPUB, "p2tr", 0, 0)).toEqual(P2TR)
    expect(deriveBitcoinAddressFromXpub(BIP86_XPUB, "p2tr", 1, 0)).toEqual(
      "bc1p3qkhfews2uk44qtvauqyr2ttdsw7svhkl9nkm9s9c3x4ax5h60wqwruhk7"
    )
  })
})
