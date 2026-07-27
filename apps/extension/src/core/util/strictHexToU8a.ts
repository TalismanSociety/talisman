import { assert, type HexString, hexToU8a } from "@talismn/util"

const REGEX_STRICT_HEX = /^0x(?:[0-9a-fA-F]{2})*$/

/**
 * Decodes a 0x-prefixed, even-length hex string, rejecting anything else.
 *
 * `hexToU8a` follows polkadot-js and right-pads odd-length input while turning invalid digits
 * into zero bytes, so `"0xzz"` decodes to `0x00`. For dapp-provided bytes that the user is shown
 * and then asked to authorize, that silent rewrite means the approved value and the used value
 * can differ - hence the strict parse.
 */
export const strictHexToU8a = (value: unknown, label: string, maxBytes: number): Uint8Array => {
  assert(
    typeof value === "string" && REGEX_STRICT_HEX.test(value),
    `Invalid ${label}: expected an even-length 0x-prefixed hex string`
  )
  assert(
    (value.length - 2) / 2 <= maxBytes,
    `Invalid ${label}: exceeds the maximum size of ${maxBytes} bytes`
  )

  return hexToU8a(value as HexString)
}
