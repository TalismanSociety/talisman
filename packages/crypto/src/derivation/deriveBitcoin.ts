import { secp256k1 } from "@noble/curves/secp256k1.js"
import { HDKey } from "@scure/bip32"
import bs58check from "bs58check"

import { encodeP2trAddress, encodeP2wpkhAddress } from "../address/encoding/bitcoinScripts"
import type { Keypair } from "../types"

export const getBitcoinPaymentsBasePath = (accountIndex = 0) => `m/84'/0'/${accountIndex}'` // BIP84, P2WPKH
export const getBitcoinOrdinalsBasePath = (accountIndex = 0) => `m/86'/0'/${accountIndex}'` // BIP86, P2TR

// address type is determined by the BIP purpose segment of the derivation path
const getAddressTypeFromPath = (derivationPath: string) =>
  /^m\/86'/.test(derivationPath) ? "p2tr" : "p2wpkh"

export const deriveBitcoin = (seed: Uint8Array, derivationPath: string): Keypair => {
  const hdkey = HDKey.fromMasterSeed(seed)

  const childKey = hdkey.derive(derivationPath)
  if (!childKey.privateKey) throw new Error("Invalid derivation path")
  const secretKey = new Uint8Array(childKey.privateKey)

  const publicKey = getPublicKeyBitcoin(secretKey)

  const address =
    getAddressTypeFromPath(derivationPath) === "p2tr"
      ? encodeP2trAddress(publicKey)
      : encodeP2wpkhAddress(publicKey)

  return { type: "bitcoin-ecdsa", secretKey, publicKey, address }
}

export const getPublicKeyBitcoin = (secretKey: Uint8Array): Uint8Array =>
  secp256k1.getPublicKey(secretKey, true) // compressed

export const getBitcoinXpub = (seed: Uint8Array, accountPath: string): string => {
  const accountKey = HDKey.fromMasterSeed(seed).derive(accountPath)
  return accountKey.publicExtendedKey
}

export const getBitcoinMasterFingerprint = (seed: Uint8Array): `0x${string}` => {
  const fingerprint = HDKey.fromMasterSeed(seed).fingerprint
  return `0x${(fingerprint >>> 0).toString(16).padStart(8, "0")}`
}

const WIF_VERSION_MAINNET = 0x80
const WIF_VERSION_TESTNET = 0xef

/**
 * Parses a WIF-encoded private key. Only compressed-pubkey WIFs are accepted:
 * uncompressed keys map to legacy address types this wallet does not track.
 */
export const parseWif = (wif: string): Uint8Array => {
  const payload = bs58check.decode(wif)
  const version = payload[0]
  if (version !== WIF_VERSION_MAINNET && version !== WIF_VERSION_TESTNET)
    throw new Error("Invalid WIF version")
  // version(1) + key(32) + compression flag(1)
  if (payload.length === 33) throw new Error("Uncompressed WIF keys are not supported")
  if (payload.length !== 34 || payload[33] !== 0x01) throw new Error("Invalid WIF")
  return payload.slice(1, 33)
}
