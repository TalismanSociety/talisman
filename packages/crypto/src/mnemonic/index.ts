import { pbkdf2 } from "@noble/hashes/pbkdf2"
import { sha512 } from "@noble/hashes/sha512"
import {
  entropyToMnemonic as entropyToMnemonicBip39,
  generateMnemonic as generateMnemonicBip39,
  mnemonicToEntropy as mnemonicToEntropyBip39,
  validateMnemonic,
} from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english"

import type { KeypairCurve } from "../types"

export const mnemonicToEntropy = (mnemonic: string) => {
  return mnemonicToEntropyBip39(mnemonic, wordlist)
}

export const entropyToMnemonic = (entropy: Uint8Array) => {
  return entropyToMnemonicBip39(entropy, wordlist)
}

const salt = (password: string) => {
  return new TextEncoder().encode(`mnemonic${password.normalize("NFKD")}`)
}

const entropyToSeedSubstrate = (entropy: Uint8Array, password?: string) => {
  return pbkdf2(sha512, entropy, salt(password ?? ""), {
    c: 2048,
    dkLen: 32,
  })
}

const entropyToSeedClassic = (entropy: Uint8Array, password?: string) => {
  const mnemonic = entropyToMnemonic(entropy)
  return pbkdf2(sha512, mnemonic.normalize("NFKD"), salt(password ?? ""), {
    c: 2048,
    dkLen: 64,
  })
}

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
  }
}

// when deriving keys from a mnemonic, we usually dont want a password here.
// a password provided here would be used as a 25th mnemonic word.
export const entropyToSeed = (entropy: Uint8Array, curve: KeypairCurve, password?: string) => {
  const type = getSeedDerivationType(curve)

  switch (type) {
    case "classic":
      return entropyToSeedClassic(entropy, password)
    case "substrate":
      return entropyToSeedSubstrate(entropy, password)
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

export const getDevSeed = (curve: KeypairCurve) => {
  const type = getSeedDerivationType(curve)

  if (!DEV_SEED_CACHE.has(type)) {
    switch (type) {
      case "classic": {
        const entropy = mnemonicToEntropy(DEV_MNEMONIC_ETHEREUM)
        const seed = entropyToSeedClassic(entropy) // 80ms
        DEV_SEED_CACHE.set(type, seed)
        break
      }
      case "substrate": {
        const entropy = mnemonicToEntropy(DEV_MNEMONIC_POLKADOT)
        const seed = entropyToSeedSubstrate(entropy) // 80ms
        DEV_SEED_CACHE.set(type, seed)
        break
      }
      default:
        throw new Error("Unsupported derivation type")
    }
  }

  return DEV_SEED_CACHE.get(type)!
}
