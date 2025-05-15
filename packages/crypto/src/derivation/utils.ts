import { stringToBytes } from "@scure/base"

import { addressEncodingFromCurve, addressFromPublicKey } from "../address"
import { entropyToSeed, getDevSeed, isValidMnemonic, mnemonicToEntropy } from "../mnemonic"
import { KeypairCurve } from "../types"
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

export const addressFromSuri = async (suri: string, type: KeypairCurve) => {
  const { mnemonic, derivationPath, password } = parseSuri(suri)

  const entropy = mnemonicToEntropy(mnemonic)
  const seed = await entropyToSeed(entropy, type, password) // ~80ms
  const { secretKey } = deriveKeypair(seed, derivationPath, type)
  const publicKey = getPublicKeyFromSecret(secretKey, type)
  const encoding = addressEncodingFromCurve(type)

  return addressFromPublicKey(publicKey, encoding)
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

export const parseSecretKey = (secretKey: string, curve: KeypairCurve) => {
  switch (curve) {
    case "ethereum":
      return stringToBytes("hex", removeHexPrefix(secretKey))
    case "ed25519":
    case "sr25519":
    case "ecdsa":
    case "bitcoin-ecdsa":
    case "bitcoin-ed25519":
    case "solana":
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
