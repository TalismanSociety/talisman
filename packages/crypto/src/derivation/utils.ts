import { base58, hex } from "@scure/base"

import { entropyToSeed, getDevSeed, mnemonicToEntropy } from "../mnemonic"
import type { AccountPlatform, KeypairCurve } from "../types"
import { deriveEcdsa, getPublicKeyEcdsa } from "./deriveEcdsa"
import { deriveEd25519, getPublicKeyEd25519 } from "./deriveEd25519"
import { deriveEthereum, getPublicKeyEthereum } from "./deriveEthereum"
import { deriveSolana, getPublicKeySolana } from "./deriveSolana"
import { deriveSr25519, getPublicKeySr25519 } from "./deriveSr25519"

export const deriveKeypair = (seed: Uint8Array, derivationPath: string, curve: KeypairCurve) => {
  switch (curve) {
    case "sr25519":
      return deriveSr25519(seed, derivationPath)
    case "ed25519":
      return deriveEd25519(seed, derivationPath)
    case "ecdsa":
      return deriveEcdsa(seed, derivationPath)
    case "bitcoin-ecdsa":
    case "bitcoin-ed25519":
      throw new Error("deriveKeypair is not implemented for Bitcoin")
    case "ethereum":
      return deriveEthereum(seed, derivationPath)
    case "solana":
      return deriveSolana(seed, derivationPath)
  }
}

export const getPublicKeyFromSecret = (secretKey: Uint8Array, curve: KeypairCurve): Uint8Array => {
  switch (curve) {
    case "ecdsa":
      return getPublicKeyEcdsa(secretKey)
    case "ethereum":
      return getPublicKeyEthereum(secretKey)
    case "sr25519":
      return getPublicKeySr25519(secretKey)
    case "ed25519":
      return getPublicKeyEd25519(secretKey)
    case "bitcoin-ecdsa":
    case "bitcoin-ed25519":
      throw new Error("getPublicKeyFromSecret is not implemented for Bitcoin")
    case "solana":
      return getPublicKeySolana(secretKey)
  }
}

export const addressFromMnemonic = async (
  mnemonic: string,
  derivationPath: string,
  curve: KeypairCurve
) => {
  const entropy = mnemonicToEntropy(mnemonic)
  try {
    const seed = await entropyToSeed(entropy, curve)
    try {
      const { address, secretKey } = deriveKeypair(seed, derivationPath, curve)
      secretKey.fill(0)
      return address
    } finally {
      seed.fill(0)
    }
  } finally {
    entropy.fill(0)
  }
}

export const removeHexPrefix = (secretKey: string) => {
  if (secretKey.startsWith("0x")) return secretKey.slice(2)
  return secretKey
}

const SECRET_KEY_LENGTH = 32
/** A Solana keypair: the 32-byte secret followed by the 32-byte public key. */
const SOLANA_KEYPAIR_LENGTH = 64

/**
 * Bytes of a JSON-array secret key (the Solana CLI keypair file format). Every element must be
 * an integer 0..255: `Uint8Array.from` would turn `null`, strings and fractions into 0 and wrap
 * anything above 255, so `[null × 32]` would import the all-zero key.
 */
const bytesFromJsonArray = (json: string): Uint8Array => {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error("Invalid secret key: not a JSON array")
  }
  if (!Array.isArray(parsed)) throw new Error("Invalid secret key: not a JSON array")
  if (!parsed.every((b) => Number.isInteger(b) && b >= 0 && b <= 255))
    throw new Error("Invalid secret key: array elements must be integers 0..255")
  return Uint8Array.from(parsed as number[])
}

/**
 * The 32 secret-key bytes behind a private key string that a user pasted, or a throw.
 * Surrounding whitespace is ignored.
 *
 * - Ethereum: hex with an optional `0x` prefix, exactly 32 bytes. `hex.decode` rejects odd
 *   lengths and non-hex characters.
 * - Solana: base58 (Phantom) or a JSON byte array (Solflare, the Solana CLI), holding either the
 *   32-byte secret or a 64-byte keypair whose embedded public key must match the one the secret
 *   derives.
 */
export const parseSecretKey = (secretKey: string, platform: AccountPlatform): Uint8Array => {
  const input = secretKey.trim()
  switch (platform) {
    case "ethereum": {
      const bytes = hex.decode(removeHexPrefix(input))
      if (bytes.length !== SECRET_KEY_LENGTH)
        throw new Error(
          `Invalid private key length: expected ${SECRET_KEY_LENGTH}, got ${bytes.length}`
        )
      return bytes
    }
    case "solana": {
      const bytes = input.startsWith("[") ? bytesFromJsonArray(input) : base58.decode(input)

      if (bytes.length === SOLANA_KEYPAIR_LENGTH) {
        const privateKey = bytes.slice(0, SECRET_KEY_LENGTH)
        const publicKey = bytes.slice(SECRET_KEY_LENGTH)
        bytes.fill(0)
        const computedPublicKey = getPublicKeySolana(privateKey)
        if (!publicKey.every((b, i) => b === computedPublicKey[i])) {
          privateKey.fill(0)
          throw new Error("Invalid Solana secret key: public key does not match")
        }
        return privateKey
      }
      if (bytes.length === SECRET_KEY_LENGTH) return bytes

      throw new Error("Invalid Solana secret key length")
    }

    default:
      throw new Error("Not implemented")
  }
}

// a path is valid when a keypair derives from it: each curve's parser throws on a malformed path
export const isValidDerivationPath = async (derivationPath: string, curve: KeypairCurve) => {
  try {
    deriveKeypair(await getDevSeed(curve), derivationPath, curve)
    return true
  } catch {
    return false
  }
}
