import { secp256k1 } from "@noble/curves/secp256k1.js"
import { ripemd160 } from "@noble/hashes/legacy.js"
import { sha256 } from "@noble/hashes/sha2.js"
import { bytesToHex, concatBytes } from "@noble/hashes/utils.js"
import { bech32, bech32m } from "bech32"

export type BitcoinHrp = "bc" | "tb"

const hash160 = (data: Uint8Array) => ripemd160(sha256(data))

// BIP340 tagged hash: sha256(sha256(tag) || sha256(tag) || msg)
const taggedHash = (tag: string, msg: Uint8Array) => {
  const tagHash = sha256(new TextEncoder().encode(tag))
  return sha256(concatBytes(tagHash, tagHash, msg))
}

/**
 * Encodes a compressed secp256k1 public key as a P2WPKH (native segwit v0) address.
 * @param publicKey - compressed (33 bytes) public key
 */
export const encodeP2wpkhAddress = (publicKey: Uint8Array, hrp: BitcoinHrp = "bc"): string => {
  if (publicKey.length !== 33) throw new Error("P2WPKH requires a compressed (33 bytes) public key")
  return bech32.encode(hrp, [0, ...bech32.toWords(hash160(publicKey))])
}

/**
 * Encodes a public key as a P2TR (taproot, segwit v1) address, applying the BIP341
 * key-path tweak to the x-only internal key.
 * @param publicKey - compressed (33 bytes) or x-only (32 bytes) public key
 */
export const encodeP2trAddress = (publicKey: Uint8Array, hrp: BitcoinHrp = "bc"): string => {
  const xOnly =
    publicKey.length === 33 ? publicKey.slice(1) : publicKey.length === 32 ? publicKey : null
  if (!xOnly) throw new Error("P2TR requires a 32 or 33 bytes public key")

  // lift_x: interpret the x-only key as the point with even y
  const internalKey = secp256k1.Point.fromHex(`02${bytesToHex(xOnly)}`)

  const tweak = BigInt(`0x${bytesToHex(taggedHash("TapTweak", xOnly))}`)
  if (tweak >= secp256k1.Point.Fn.ORDER) throw new Error("Invalid taproot tweak")

  const outputKey = internalKey.add(secp256k1.Point.BASE.multiply(tweak)).toBytes(true).slice(1)

  return bech32m.encode(hrp, [1, ...bech32m.toWords(outputKey)])
}
