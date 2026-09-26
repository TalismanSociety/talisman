import { HDKey } from "@scure/bip32"
import bs58check from "bs58check"

import { type BitcoinHrp, encodeP2trAddress, encodeP2wpkhAddress } from "./bitcoinScripts"

export type BitcoinAddressType = "p2wpkh" | "p2tr"

// SLIP-132 version bytes for BIP32 extended public keys (mainnet + testnet/signet)
const XPUB_VERSION_BY_PREFIX = {
  xpub: 0x0488b21e,
  ypub: 0x049d7cb2,
  zpub: 0x04b24746,
  tpub: 0x043587cf,
  upub: 0x044a5262,
  vpub: 0x045f1cf6,
} as const

export type XpubPrefix = keyof typeof XPUB_VERSION_BY_PREFIX

const XPUB_VERSIONS = Object.values(XPUB_VERSION_BY_PREFIX) as number[]

const CANONICAL_XPUB_VERSION = XPUB_VERSION_BY_PREFIX.xpub

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

const encodeXpubWithVersion = (payload: Uint8Array, version: number): string => {
  payload[0] = (version >>> 24) & 0xff
  payload[1] = (version >>> 16) & 0xff
  payload[2] = (version >>> 8) & 0xff
  payload[3] = version & 0xff
  return bs58check.encode(payload)
}

/** Re-encodes any SLIP-132 extended public key (ypub/zpub/tpub/upub/vpub) with canonical xpub version bytes */
export const normalizeXpub = (address: string): string =>
  encodeXpubWithVersion(decodeXpub(address), CANONICAL_XPUB_VERSION)

/** SLIP-132 prefix of an extended public key (xpub/ypub/zpub/tpub/upub/vpub) */
export const getXpubPrefix = (address: string): XpubPrefix => {
  const payload = decodeXpub(address)
  const version = ((payload[0] << 24) | (payload[1] << 16) | (payload[2] << 8) | payload[3]) >>> 0
  const entry = Object.entries(XPUB_VERSION_BY_PREFIX).find(([, v]) => v === version)
  if (!entry) throw new TypeError(`${address} has an unknown extended key version`)
  return entry[0] as XpubPrefix
}

/**
 * Re-encodes an extended public key with the SLIP-132 version bytes other wallets and
 * explorers expect for the given script type: zpub/vpub for BIP84 P2WPKH, plain
 * xpub/tpub for BIP86 P2TR (taproot never adopted SLIP-132 prefixes).
 * Internal storage keeps the canonical xpub form — this is a display/export encoding.
 */
export const encodeXpubForDisplay = (
  xpub: string,
  addressType: BitcoinAddressType,
  hrp: BitcoinHrp = "bc"
): string => {
  const prefix: XpubPrefix =
    addressType === "p2wpkh" ? (hrp === "bc" ? "zpub" : "vpub") : hrp === "bc" ? "xpub" : "tpub"
  return encodeXpubWithVersion(decodeXpub(xpub), XPUB_VERSION_BY_PREFIX[prefix])
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
