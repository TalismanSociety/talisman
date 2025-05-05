import { bech32, bech32m } from "bech32"
import bs58check from "bs58check"

export const isBitcoinAddress = (address: string) =>
  isBech32mAddress(address) || isBech32Address(address) || isBase58CheckAddress(address)

export function isBech32mAddress(address: string) {
  try {
    fromBech32m(address)
  } catch {
    return false
  }
  return true
}

export function isBech32Address(address: string) {
  try {
    fromBech32(address)
  } catch {
    return false
  }
  return true
}

export function isBase58CheckAddress(address: string) {
  try {
    fromBase58Check(address)
  } catch {
    return false
  }
  return true
}

/**
 * Converts a Bech32m encoded address to its corresponding data representation.
 * @param address - The Bech32m encoded address.
 * @returns An object containing the version, prefix, and data of the address.
 * @throws {TypeError} If the address uses the wrong encoding.
 */
export function fromBech32m(address: string) {
  const result = bech32m.decode(address)
  const version = result.words[0]
  if (version === 0) throw new TypeError(address + " uses wrong encoding")
  const data = bech32m.fromWords(result.words.slice(1))
  return {
    version,
    prefix: result.prefix,
    data: Uint8Array.from(data),
  }
}

/**
 * Converts a Bech32 encoded address to its corresponding data representation.
 * @param address - The Bech32 encoded address.
 * @returns An object containing the version, prefix, and data of the address.
 * @throws {TypeError} If the address uses the wrong encoding.
 */
export function fromBech32(address: string) {
  const result = bech32.decode(address)
  const version = result.words[0]
  if (version !== 0) throw new TypeError(address + " uses wrong encoding")
  const data = bech32.fromWords(result.words.slice(1))
  return {
    version,
    prefix: result.prefix,
    data: Uint8Array.from(data),
  }
}

/**
 * Decodes a base58check encoded Bitcoin address and returns the version and hash.
 *
 * @param address - The base58check encoded Bitcoin address to decode.
 * @returns An object containing the version and hash of the decoded address.
 * @throws {TypeError} If the address is too short or too long.
 */
export function fromBase58Check(address: string) {
  const payload = bs58check.decode(address)
  if (payload.length < 21) throw new TypeError(address + " is too short")
  if (payload.length > 21) throw new TypeError(address + " is too long")
  function readUInt8(buffer: Uint8Array, offset: number) {
    if (offset + 1 > buffer.length) {
      throw new Error("Offset is outside the bounds of Uint8Array")
    }
    const buf = Buffer.from(buffer)
    return buf.readUInt8(offset)
  }
  const version = readUInt8(payload, 0)
  const hash = payload.slice(1)
  return { version, hash }
}
