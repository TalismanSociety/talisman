import { base58, hex } from "@scure/base"

import { entropyToSeed, getDevSeed, isValidMnemonic, mnemonicToEntropy } from "../mnemonic"
import { AccountPlatform, KeypairCurve } from "../types"
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
  curve: KeypairCurve,
) => {
  const entropy = mnemonicToEntropy(mnemonic)
  const seed = await entropyToSeed(entropy, curve)
  const { address } = deriveKeypair(seed, derivationPath, curve)
  return address
}

/**
 * @dev we only expect suri to contain a mnemonic and derivation path.
 * for other cases see https://polkadot.js.org/docs/keyring/start/suri/
 */
export const parseSuri = (suri: string) => {
  // extract password if any
  const indexOfPassword = suri.indexOf("///")
  const password = indexOfPassword === -1 ? undefined : suri.slice(indexOfPassword + 3)
  if (password) suri = suri.slice(0, indexOfPassword)

  // split mnemonic and derivation path
  const indexOfSlash = suri.indexOf("/")
  const mnemonic = indexOfSlash === -1 ? suri : suri.slice(0, indexOfSlash)
  let derivationPath = indexOfSlash === -1 ? "" : suri.slice(indexOfSlash)

  // if BIP44, leading slash must be removed
  if (derivationPath.startsWith("/m/")) derivationPath = derivationPath.slice(1)

  if (!isValidMnemonic(mnemonic)) throw new Error("Invalid mnemonic")

  return { mnemonic, derivationPath, password }
}

export const removeHexPrefix = (secretKey: string) => {
  if (secretKey.startsWith("0x")) return secretKey.slice(2)
  return secretKey
}

export const parseSecretKey = (secretKey: string, platform: AccountPlatform) => {
  switch (platform) {
    case "ethereum": {
      const privateKey = removeHexPrefix(secretKey)
      return hex.decode(privateKey)
    }
    case "solana": {
      const bytes = secretKey.startsWith("[")
        ? // JSON bytes array (ex: solflare)
          Uint8Array.from(JSON.parse(secretKey))
        : // base58 encoded string (ex: phantom)
          base58.decode(secretKey)

      if (bytes.length === 64) {
        const privateKey = bytes.slice(0, 32)
        const publicKey = bytes.slice(32, 64)
        const computedPublicKey = getPublicKeySolana(privateKey)
        if (!publicKey.every((b, i) => b === computedPublicKey[i]))
          throw new Error("Invalid Solana secret key: public key does not match")
        return privateKey
      } else if (bytes.length === 32) return bytes

      throw new Error("Invalid Solana secret key length")
    }

    default:
      throw new Error("Not implemented")
  }
}

// @dev: didn't find a reliable source of information on which characters are valid => assume it s valid if a keypair can be generated from it
export const isValidDerivationPath = async (derivationPath: string, curve: KeypairCurve) => {
  try {
    deriveKeypair(await getDevSeed(curve), derivationPath, curve)
    return true
  } catch (err) {
    return false
  }
}
