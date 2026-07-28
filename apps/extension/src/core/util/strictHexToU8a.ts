import { assert, type HexString, hexToU8a } from "@talismn/util"

const REGEX_STRICT_HEX = /^0x(?:[0-9a-fA-F]{2})*$/

/**
 * Decodes a 0x-prefixed, even-length hex string, rejecting anything else.
 *
 * `hexToU8a` follows polkadot-js and silently rewrites malformed input (`"0xzz"` decodes to
 * `0x00`), which for bytes the user is shown and then asked to authorize means the approved value
 * and the used value can differ.
 */
export const strictHexToU8a = (value: unknown, label: string, maxBytes: number): Uint8Array => {
  const malformed = `Invalid ${label}: expected an even-length 0x-prefixed hex string`

  assert(typeof value === "string", malformed)
  // bound the length before the regex, so an oversized string is rejected without being scanned
  assert(
    (value.length - 2) / 2 <= maxBytes,
    `Invalid ${label}: exceeds the maximum size of ${maxBytes} bytes`
  )
  assert(REGEX_STRICT_HEX.test(value), malformed)

  return hexToU8a(value as HexString)
}
