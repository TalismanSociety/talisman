import {
  entropyToMnemonic as entropyToMnemonicBip39,
  generateMnemonic as generateMnemonicBip39,
  mnemonicToEntropy as mnemonicToEntropyBip39,
  validateMnemonic,
} from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english"

import type { KeypairCurve } from "../types"
import { pbkdf2 } from "../utils"

export const mnemonicToEntropy = (mnemonic: string) => {
  return mnemonicToEntropyBip39(mnemonic, wordlist)
}

export const entropyToMnemonic = (entropy: Uint8Array) => {
  return entropyToMnemonicBip39(entropy, wordlist)
}

const entropyToSeedSubstrate = async (entropy: Uint8Array, password?: string) =>
  await pbkdf2(
    "SHA-512",
    entropy,
    mnemonicPasswordToSalt(password ?? ""),
    2048, // 2048 iterations
    32, // 32 bytes (32 * 8 == 256 bits)
  )

const entropyToSeedClassic = async (entropy: Uint8Array, password?: string) =>
  await pbkdf2(
    "SHA-512",
    encodeNormalized(entropyToMnemonic(entropy)),
    mnemonicPasswordToSalt(password ?? ""),
    2048, // 2048 iterations
    64, // 64 bytes (64 * 8 == 512 bits)
  )

const mnemonicPasswordToSalt = (password: string) => encodeNormalized(`mnemonic${password}`)

/** Normalizes a UTF-8 string using `NFKD` form, then encodes it into bytes */
const encodeNormalized = (utf8: string): Uint8Array =>
  new TextEncoder().encode(utf8.normalize("NFKD"))

type SeedDerivationType = "substrate" | "classic"

const getSeedDerivationType = (curve: KeypairCurve): SeedDerivationType => {
  switch (curve) {
    case "sr25519":
    case "ed25519":
    case "ecdsa":
      return "substrate"
    case "ethereum":
    case "solana":
      return "classic"
    case "bitcoin-ecdsa":
    case "bitcoin-ed25519":
      throw new Error("seed derivation is not implemented for Bitcoin")
  }
}

// when deriving keys from a mnemonic, we usually dont want a password here.
// a password provided here would be used as a 25th mnemonic word.
export const entropyToSeed = async (
  entropy: Uint8Array,
  curve: KeypairCurve,
  password?: string,
) => {
  const type = getSeedDerivationType(curve)

  switch (type) {
    case "classic":
      return await entropyToSeedClassic(entropy, password)
    case "substrate":
      return await entropyToSeedSubstrate(entropy, password)
  }
}

export const isValidMnemonic = (mnemonic: string) => {
  return validateMnemonic(mnemonic, wordlist)
}

export const generateMnemonic = (words: 12 | 24) => {
  switch (words) {
    case 12:
      return generateMnemonicBip39(wordlist, 128)
    case 24:
      return generateMnemonicBip39(wordlist, 256)
  }
}

// well-known mnemonic used by polkadot.js, can be checked on polkadot wiki
export const DEV_MNEMONIC_POLKADOT =
  "bottom drive obey lake curtain smoke basket hold race lonely fit walk"

// well-known phrase used by hardhat and anvil
export const DEV_MNEMONIC_ETHEREUM = "test test test test test test test test test test test junk"

// keep dev seeds in cache as we will reuse them to validate multiple derivation paths
const DEV_SEED_CACHE = new Map<SeedDerivationType, Uint8Array>()

export const getDevSeed = async (curve: KeypairCurve) => {
  const type = getSeedDerivationType(curve)

  if (!DEV_SEED_CACHE.has(type)) {
    switch (type) {
      case "classic": {
        const entropy = mnemonicToEntropy(DEV_MNEMONIC_ETHEREUM)
        const seed = await entropyToSeedClassic(entropy) // 80ms
        DEV_SEED_CACHE.set(type, seed)
        break
      }
      case "substrate": {
        const entropy = mnemonicToEntropy(DEV_MNEMONIC_POLKADOT)
        const seed = await entropyToSeedSubstrate(entropy) // 80ms
        DEV_SEED_CACHE.set(type, seed)
        break
      }
      default:
        throw new Error("Unsupported derivation type")
    }
  }

  return DEV_SEED_CACHE.get(type)!
}
