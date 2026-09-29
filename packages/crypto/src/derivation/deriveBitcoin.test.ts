import { bytesToHex } from "@noble/hashes/utils.js"
import { describe, expect, it } from "vitest"
import { normalizeXpub } from "../address"
import { entropyToSeed, mnemonicToEntropy } from "../mnemonic"
import { deriveKeypair } from "."
import {
  getBitcoinMasterFingerprint,
  getBitcoinOrdinalsBasePath,
  getBitcoinPaymentsBasePath,
  getBitcoinXpub,
  parseWif,
} from "./deriveBitcoin"

// official BIP84 / BIP86 test vectors mnemonic
const BIP_MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

// BIP84 (P2WPKH) vectors — https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
const BIP84_ACCOUNT_ZPUB =
  "zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs"
const BIP84_ADDRESS_0_0 = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu"
const BIP84_ADDRESS_0_1 = "bc1qnjg0jd8228aq7egyzacy8cys3knf9xvrerkf9g"
const BIP84_ADDRESS_1_0 = "bc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el"

// BIP86 (P2TR) vectors — https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki
const BIP86_ACCOUNT_XPUB =
  "xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ"
const BIP86_ADDRESS_0_0 = "bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr"
const BIP86_ADDRESS_0_1 = "bc1p4qhjn9zdvkux4e44uhx8tc55attvtyu358kutcqkudyccelu0was9fqzwh"
const BIP86_ADDRESS_1_0 = "bc1p3qkhfews2uk44qtvauqyr2ttdsw7svhkl9nkm9s9c3x4ax5h60wqwruhk7"

const BIP_MASTER_FINGERPRINT = "0x73c5da0a"

const getSeed = async () => await entropyToSeed(mnemonicToEntropy(BIP_MNEMONIC), "bitcoin-ecdsa")

describe("deriveBitcoin", () => {
  it("derives BIP84 payments addresses", async () => {
    const seed = await getSeed()
    expect(deriveKeypair(seed, "m/84'/0'/0'/0/0", "bitcoin-ecdsa").address).toEqual(
      BIP84_ADDRESS_0_0
    )
    expect(deriveKeypair(seed, "m/84'/0'/0'/0/1", "bitcoin-ecdsa").address).toEqual(
      BIP84_ADDRESS_0_1
    )
    expect(deriveKeypair(seed, "m/84'/0'/0'/1/0", "bitcoin-ecdsa").address).toEqual(
      BIP84_ADDRESS_1_0
    )
  })

  it("derives BIP86 ordinals (taproot) addresses", async () => {
    const seed = await getSeed()
    expect(deriveKeypair(seed, "m/86'/0'/0'/0/0", "bitcoin-ecdsa").address).toEqual(
      BIP86_ADDRESS_0_0
    )
    expect(deriveKeypair(seed, "m/86'/0'/0'/0/1", "bitcoin-ecdsa").address).toEqual(
      BIP86_ADDRESS_0_1
    )
    expect(deriveKeypair(seed, "m/86'/0'/0'/1/0", "bitcoin-ecdsa").address).toEqual(
      BIP86_ADDRESS_1_0
    )
  })

  it("derives account xpubs matching the BIP84/BIP86 vectors", async () => {
    const seed = await getSeed()
    expect(getBitcoinXpub(seed, getBitcoinPaymentsBasePath(0))).toEqual(
      normalizeXpub(BIP84_ACCOUNT_ZPUB)
    )
    expect(getBitcoinXpub(seed, getBitcoinOrdinalsBasePath(0))).toEqual(BIP86_ACCOUNT_XPUB)
  })

  it("derives the master fingerprint", async () => {
    const seed = await getSeed()
    expect(getBitcoinMasterFingerprint(seed)).toEqual(BIP_MASTER_FINGERPRINT)
  })
})

describe("parseWif", () => {
  // bitcoin wiki WIF example key
  const PRIVATE_KEY_HEX = "0c28fca386c7a227600b2fe50b7cae11ec86d3bf1fbe471be89827e19d72aa1d"
  const WIF_COMPRESSED = "KwdMAjGmerYanjeui5SHS7JkmpZvVipYvB2LJGU1ZxJwYvP98617"
  const WIF_UNCOMPRESSED = "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ"

  it("parses a compressed WIF", () => {
    expect(bytesToHex(parseWif(WIF_COMPRESSED))).toEqual(PRIVATE_KEY_HEX)
  })

  it("rejects an uncompressed WIF", () => {
    expect(() => parseWif(WIF_UNCOMPRESSED)).toThrow("Uncompressed WIF keys are not supported")
  })

  it("rejects garbage", () => {
    expect(() => parseWif("not-a-wif")).toThrow()
  })
})
