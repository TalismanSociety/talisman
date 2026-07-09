import { HDKey } from "@scure/bip32"
import bs58check from "bs58check"

import { type BitcoinHrp, encodeP2trAddress, encodeP2wpkhAddress } from "./bitcoinScripts"

export type BitcoinAddressType = "p2wpkh" | "p2tr"

// SLIP-132 version bytes for BIP32 extended public keys (mainnet + testnet/signet)
const XPUB_VERSIONS = [
  0x0488b21e, // xpub
  0x049d7cb2, // ypub
  0x04b24746, // zpub
  0x043587cf, // tpub
  0x044a5262, // upub
  0x045f1cf6, // vpub
]

const CANONICAL_XPUB_VERSION = 0x0488b21e // xpub

const XPUB_PAYLOAD_LENGTH = 78

const decodeXpub = (address: string) => {
  const payload = bs58check.decode(address)
  if (payload.length !== XPUB_PAYLOAD_LENGTH)
    throw new TypeError(`${address} is not a BIP32 extended key`)
  const version = (payload[0] << 24) | (payload[1] << 16) | (payload[2] << 8) | payload[3]
  if (!XPUB_VERSIONS.includes(version >>> 0))
    throw new TypeError(`${address} has an unknown extended key version`)
  return payload
}

export const isBitcoinXpub = (address: string): boolean => {
  try {
    decodeXpub(address)
    return true
  } catch {
    return false
  }
}

/** Re-encodes any SLIP-132 extended public key (ypub/zpub/tpub/upub/vpub) with canonical xpub version bytes */
export const normalizeXpub = (address: string): string => {
  const payload = decodeXpub(address)
  payload[0] = (CANONICAL_XPUB_VERSION >>> 24) & 0xff
  payload[1] = (CANONICAL_XPUB_VERSION >>> 16) & 0xff
  payload[2] = (CANONICAL_XPUB_VERSION >>> 8) & 0xff
  payload[3] = CANONICAL_XPUB_VERSION & 0xff
  return bs58check.encode(payload)
}

/**
 * Derives an on-chain address from an account-level extended public key.
 * @param xpub - account-level extended public key (any SLIP-132 flavor)
 * @param change - 0 = external (receive) chain, 1 = internal (change) chain
 */
export const deriveBitcoinAddressFromXpub = (
  xpub: string,
  addressType: BitcoinAddressType,
  change: 0 | 1,
  index: number,
  hrp: BitcoinHrp = "bc"
): string => {
  const hdkey = HDKey.fromExtendedKey(normalizeXpub(xpub))
  const publicKey = hdkey.deriveChild(change).deriveChild(index).publicKey
  if (!publicKey) throw new Error("Unable to derive public key from xpub")

  switch (addressType) {
    case "p2wpkh":
      return encodeP2wpkhAddress(publicKey, hrp)
    case "p2tr":
      return encodeP2trAddress(publicKey, hrp)
  }
}
