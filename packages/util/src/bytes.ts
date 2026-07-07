import { type HexString, isHexString } from "./isHexString"

/**
 * Byte / hex primitives, drop-in equivalents of the `@polkadot/util` helpers we used to depend on.
 * Semantics intentionally match polkadot-js for migration safety.
 */

export const hexToU8a = (hex?: string | null): Uint8Array => {
  if (!hex) return new Uint8Array()
  const value = hex.startsWith("0x") ? hex.slice(2) : hex
  // polkadot-js right-pads odd-length hex
  const padded = value.length % 2 ? `${value}0` : value
  const result = new Uint8Array(padded.length / 2)
  for (let i = 0; i < result.length; i++)
    result[i] = parseInt(padded.substring(i * 2, i * 2 + 2), 16)
  return result
}

export const u8aToHex = (value?: Uint8Array | null): HexString => {
  if (!value?.length) return "0x"
  let hex = ""
  for (const byte of value) hex += byte.toString(16).padStart(2, "0")
  return `0x${hex}`
}

export const stringToU8a = (value?: string | null): Uint8Array =>
  value ? new TextEncoder().encode(value) : new Uint8Array()

export const u8aToString = (value?: Uint8Array | null): string =>
  value?.length ? new TextDecoder("utf-8").decode(value) : ""

export const hexToString = (hex?: string | null): string => u8aToString(hexToU8a(hex))

export const hexToNumber = (hex?: string | null): number => (hex ? parseInt(hex, 16) : NaN)

export const numberToU8a = (value?: number | null): Uint8Array => {
  let hex = (value ?? 0).toString(16)
  if (hex.length % 2) hex = `0${hex}`
  return hexToU8a(hex)
}

/** Coerces hex strings, utf-8 strings, number arrays and buffers to Uint8Array (polkadot-js semantics) */
export const u8aToU8a = (value?: string | number[] | Uint8Array | null): Uint8Array => {
  if (!value) return new Uint8Array()
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value)) return new Uint8Array(value)
  return isHexString(value) ? hexToU8a(value) : stringToU8a(value)
}

export const u8aConcat = (...items: (string | number[] | Uint8Array)[]): Uint8Array => {
  const chunks = items.map((item) => u8aToU8a(item))
  const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export const u8aEq = (a: string | Uint8Array, b: string | Uint8Array): boolean => {
  const u8aa = u8aToU8a(a)
  const u8ab = u8aToU8a(b)
  if (u8aa.length !== u8ab.length) return false
  return u8aa.every((byte, i) => byte === u8ab[i])
}

export const u8aCmp = (a: string | Uint8Array, b: string | Uint8Array): number => {
  const u8aa = u8aToU8a(a)
  const u8ab = u8aToU8a(b)
  for (let i = 0; i < Math.max(u8aa.length, u8ab.length); i++) {
    const byteA = u8aa[i] ?? 0
    const byteB = u8ab[i] ?? 0
    if (byteA !== byteB) return byteA < byteB ? -1 : 1
  }
  return u8aa.length === u8ab.length ? 0 : u8aa.length < u8ab.length ? -1 : 1
}

/**
 * Tests if the input is printable ASCII (code points 32-126). Hex strings are decoded to bytes
 * first, other strings are checked character-wise (polkadot-js `isAscii` semantics).
 */
export const isAsciiPrintable = (value?: string | Uint8Array | null): boolean => {
  if (value == null) return false
  const bytes =
    typeof value === "string" && !isHexString(value) ? stringToU8a(value) : u8aToU8a(value)
  return bytes.every((b) => b >= 32 && b <= 126)
}

const U8A_WRAP_PREFIX = stringToU8a("<Bytes>")
const U8A_WRAP_POSTFIX = stringToU8a("</Bytes>")

const u8aIsWrapped = (value: Uint8Array): boolean =>
  value.length >= U8A_WRAP_PREFIX.length + U8A_WRAP_POSTFIX.length &&
  u8aEq(value.subarray(0, U8A_WRAP_PREFIX.length), U8A_WRAP_PREFIX) &&
  u8aEq(value.subarray(value.length - U8A_WRAP_POSTFIX.length), U8A_WRAP_POSTFIX)

/** Wraps bytes with `<Bytes>...</Bytes>` for raw-message signing, unless already wrapped */
export const u8aWrapBytes = (value: string | Uint8Array): Uint8Array => {
  const u8a = u8aToU8a(value)
  return u8aIsWrapped(u8a) ? u8a : u8aConcat(U8A_WRAP_PREFIX, u8a, U8A_WRAP_POSTFIX)
}

export const u8aUnwrapBytes = (value: string | Uint8Array): Uint8Array => {
  const u8a = u8aToU8a(value)
  return u8aIsWrapped(u8a)
    ? u8a.subarray(U8A_WRAP_PREFIX.length, u8a.length - U8A_WRAP_POSTFIX.length)
    : u8a
}
