import { describe, expect, it } from "vitest"
import { entropyToSeed, mnemonicToEntropy } from "../mnemonic"
import type { KeypairCurve } from "../types"
import { addressFromMnemonic, deriveKeypair, isValidDerivationPath } from "./utils"

// Known answers for the paths the extension and the mobile app generate. Every substrate
// address below equals @polkadot/keyring 13 `addFromUri(mnemonic + path)` for the same curve.
const POLKADOT_DEV = "bottom drive obey lake curtain smoke basket hold race lonely fit walk"
const ABANDON =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
const HARDHAT = "test test test test test test test test test test test junk"

const KNOWN_ADDRESSES: [mnemonic: string, curve: KeypairCurve, path: string, address: string][] = [
  [POLKADOT_DEV, "sr25519", "", "5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV"],
  [POLKADOT_DEV, "sr25519", "//0", "5D34dL5prEUaGNQtPPZ3yN5Y6BnkfXunKXXz6fo7ZJbLwRRH"],
  [POLKADOT_DEV, "sr25519", "//1", "5GBNeWRhZc2jXu7D55rBimKYDk8PGk8itRYFTPfC8RJLKG5o"],
  [POLKADOT_DEV, "sr25519", "//41", "5Cy9xMFtiyMzkbyVakh35zH2cxiW57kEsgeg4rmqtmqFXcqw"],
  [POLKADOT_DEV, "sr25519", "//polkadot", "5HdHWkvPFBLd57XgZTVN2WFxaHmrswAmhSrTipd75EKww1af"],
  [POLKADOT_DEV, "sr25519", "//Alice", "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"],
  [POLKADOT_DEV, "sr25519", "/1", "5DCyihKprMsGj3vNzmhnCpx827jCTd4fHQzZAxyyNy7dBRnA"],
  [POLKADOT_DEV, "sr25519", "//0/1", "5HgHERTtCtWUzn6zCvYQpzRDYphKEXKysJWM6JcwVkmpek1L"],
  [POLKADOT_DEV, "sr25519", "//1//2", "5D5KWj9iTDgT1NXqEe28T9hFgARGhjBDrvigikiknUA7xeU1"],
  [POLKADOT_DEV, "sr25519", "//4294967295", "5EKxD7tCHQL3Fo933enZJdyCaCzXEdWZdoegFU2s3ZLmi3dE"],
  [POLKADOT_DEV, "sr25519", "//016", "5HNc3XWyD7M6uoKRnD7EgV7T1dubVB73SspA8zwbBomNrXPX"],
  [POLKADOT_DEV, "sr25519", "//00", "5D34dL5prEUaGNQtPPZ3yN5Y6BnkfXunKXXz6fo7ZJbLwRRH"],
  [POLKADOT_DEV, "sr25519", "//0x10", "5HNc3XWyD7M6uoKRnD7EgV7T1dubVB73SspA8zwbBomNrXPX"],
  [POLKADOT_DEV, "sr25519", "//a_b", "5H6YFmFdYTpwvp3JvBm8igAgZ6okfn6nj7rt1asbdvkRe3bi"],
  [
    POLKADOT_DEV,
    "sr25519",
    `//${"a".repeat(31)}`,
    "5CUMfSQxBJUS2kNZ3fPKhte7CPHQz9WWjvL6LMHcGy6ma6xq",
  ],
  // junction ids over 32 bytes are blake2-256 hashed, as polkadot-js does
  [
    POLKADOT_DEV,
    "sr25519",
    `//${"a".repeat(32)}`,
    "5FjXrmeQoVarKEVc1bSev5PjyV9dKND7g1wnfQDYvXtx9VxT",
  ],
  [
    POLKADOT_DEV,
    "sr25519",
    `//${"a".repeat(40)}`,
    "5HdmcAaRDxL6RRsx1FDrpDJebj2ux3JAjfxk1cJngZi3KYkS",
  ],
  [POLKADOT_DEV, "ed25519", "//0", "5HrCphkqYygSXWt9rHebqaqbfEYekhzjyjQNjZiPxpb3XsKY"],
  [POLKADOT_DEV, "ed25519", "//polkadot", "5GSnLCEBqtAw6nLiKbZ5ro34rgr46ZtWVyT1K2wi5nig2xKt"],
  [
    POLKADOT_DEV,
    "ed25519",
    `//${"a".repeat(40)}`,
    "5HSJ4oHbtrhAa8zGTHeaV1W5W4jntAFJCJoXVmiUZ8X3EKKJ",
  ],
  [POLKADOT_DEV, "ecdsa", "//0", "5EYLKPDaH7gGuon5vesr5QX8S9c22wYvgWwdRoGj3FykwoE8"],
  [POLKADOT_DEV, "ecdsa", "//polkadot", "5EEMsPfF7e4CHJXJFnWi1AUEnbcnenQ8Dw9vWnXguNmsxq7c"],
  [ABANDON, "sr25519", "", "5EPCUjPxiHAcNooYipQFWr9NmmXJKpNG5RhcntXwbtUySrgH"],
  [ABANDON, "sr25519", "//0", "5DvaFrBesD6jTWd3GEefcM72BSXaFRHqQuZtwBSZii1VMnuP"],
  [ABANDON, "sr25519", "//polkadot", "5CUjtdx1fMZpZP9s9JyN8LC96EZcfWh9dT6k8dyQdFyEmrQP"],
  [ABANDON, "sr25519", "/1", "5DCLBBYt2At7Poji5MbQ8nXp6FbQ6ext9AD7i4VZg7Eb3zai"],
  [ABANDON, "ed25519", "//0", "5G15zyNFvx63cvMkpqNu4KrQtQ8FERh2AK4dcAywnFMMf5nB"],
  [ABANDON, "ecdsa", "//0", "5H8Nx1vMnNSgsWkUekthGCg4ZVtmpiu7LmUVQbmRkGkpRFff"],
  [HARDHAT, "ethereum", "m/44'/60'/0'/0/0", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
  [HARDHAT, "ethereum", "m/44'/60'/0'/0/1", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"],
  [HARDHAT, "ethereum", "m/44'/60'/0'/0/2", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"],
  [HARDHAT, "ethereum", "m/44'/60'/1'/0/0", "0x8C8d35429F74ec245F8Ef2f4Fd1e551cFF97d650"],
  [ABANDON, "ethereum", "m/44'/60'/0'/0/0", "0x9858EfFD232B4033E47d90003D41EC34EcaEda94"],
  [ABANDON, "ethereum", "m/44'/60'/0'/0/1", "0x6Fac4D18c912343BF86fa7049364Dd4E424Ab9C0"],
  [HARDHAT, "solana", "m/44'/501'/0'/0'", "oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96"],
  [HARDHAT, "solana", "m/44'/501'/1'/0'", "AqynRZwvVqUPRwRJXvm6odUb3t93fDjnWe3p6BeuUFxD"],
  [HARDHAT, "solana", "m/44'/501'/2'/0'", "CqMbRgMuEhQi9BUS8xP44Wk5nENm48FqJnfjEi4eNb1k"],
  [HARDHAT, "solana", "m/44'/501'/0'", "BtELVjZSaWhMat94P9HyasX3Gvpv6C7WHXJGqWdZbwSQ"],
  [HARDHAT, "solana", "m/44'/501'/2147483647'/0'", "2gyT4DSBGyK2mgNFiw3ezdf2UkEZHKSnGxvMffN5GfEK"],
  [HARDHAT, "solana", "m/0'", "9prKsPNZJNMFxeBRbCB25tFbky8TexEhyUJRG2MejtqQ"],
  [HARDHAT, "solana", "m/00'", "9prKsPNZJNMFxeBRbCB25tFbky8TexEhyUJRG2MejtqQ"],
  [ABANDON, "solana", "m/44'/501'/0'/0'", "HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk"],
  [ABANDON, "solana", "m/44'/501'/1'/0'", "Hh8QwFUA6MtVu1qAoq12ucvFHNwCcVTV7hpWjeY1Hztb"],
]

describe("derivation paths", () => {
  it.each(KNOWN_ADDRESSES)("%#: %s %s", async (mnemonic, curve, path, address) => {
    expect(await addressFromMnemonic(mnemonic, path, curve)).toBe(address)
  })
})

describe("substrate derivation path parser", () => {
  const sr25519 = (path: string) => addressFromMnemonic(ABANDON, path, "sr25519")

  it.each([
    "junk",
    "//",
    "/",
    "//0/",
    "abc//0",
    " //0",
    "//0 ",
    "//日本",
    "//Ünïcode",
    "//Alice-Bob",
    "//Alice Bob",
  ])("rejects malformed path %j", async (path) => {
    await expect(sr25519(path)).rejects.toThrow("Invalid derivation path")
  })

  it.each(["///password", "//Alice///pw", "///"])("rejects password syntax %j", async (path) => {
    await expect(sr25519(path)).rejects.toThrow("Passwords (///) are not supported")
  })

  it.each(["//4294967296", `//${"9".repeat(40)}`])("rejects index %j above u32", async (path) => {
    await expect(sr25519(path)).rejects.toThrow("Derivation index out of range")
  })

  // JavaScript reads these as numbers, polkadot-js reads them as strings or bytes
  it.each([
    "//Infinity",
    "//1e3",
    "//0b11",
    "//0o7",
    "//0X10",
    "//0x1",
    "//0x1000",
    "//0x10000000",
    "//0x",
  ])("rejects ambiguous numeric code %j", async (path) => {
    await expect(sr25519(path)).rejects.toThrow("Ambiguous numeric derivation code")
  })

  it("reports malformed paths as invalid", async () => {
    expect(await isValidDerivationPath("//0", "sr25519")).toBe(true)
    expect(await isValidDerivationPath("", "sr25519")).toBe(true)
    expect(await isValidDerivationPath("//Alice-Bob", "sr25519")).toBe(false)
    expect(await isValidDerivationPath("junk", "ed25519")).toBe(false)
    expect(await isValidDerivationPath("///password", "ecdsa")).toBe(false)
  })
})

describe("solana derivation path parser", () => {
  const solana = (path: string) => addressFromMnemonic(ABANDON, path, "solana")

  it.each(["m/abc'", "m/'", "m/0abc'", "m/ 0'", "m/0.9'", "m/0x10'", "m/-1'", "m/1e3'"])(
    "rejects malformed index %j",
    async (path) => {
      await expect(solana(path)).rejects.toThrow("Invalid derivation path index")
    }
  )

  it.each(["m/2147483648'", "m/4294967296'", `m/${"9".repeat(20)}'`])(
    "rejects index %j at or above 2^31",
    async (path) => {
      await expect(solana(path)).rejects.toThrow("Derivation path index out of range")
    }
  )

  it.each(["m/0", "m/44'/501'/0'/0", "m/"])("rejects non-hardened path %j", async (path) => {
    await expect(solana(path)).rejects.toThrow("Only hardened derivation is supported")
  })
})

describe("derivation buffers", () => {
  it.each<[KeypairCurve, string]>([
    ["sr25519", ""],
    ["sr25519", "//0/1"],
    ["ed25519", ""],
    ["ed25519", "//0"],
    ["ecdsa", ""],
    ["ecdsa", "//0"],
    ["ethereum", "m/44'/60'/0'/0/0"],
    ["solana", "m/44'/501'/0'/0'"],
  ])("%s %j leaves the seed intact and returns a key the caller owns", async (curve, path) => {
    const seed = await entropyToSeed(mnemonicToEntropy(ABANDON), curve)
    const copy = seed.slice()

    const first = deriveKeypair(seed, path, curve)
    expect(seed).toEqual(copy)
    expect(first.secretKey.buffer).not.toBe(seed.buffer)

    // zeroing one result must not affect the seed or a later derivation
    const { address } = first
    first.secretKey.fill(0)
    expect(seed).toEqual(copy)
    expect(deriveKeypair(seed, path, curve).address).toBe(address)
  })
})
