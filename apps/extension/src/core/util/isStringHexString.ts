import { HexString } from "@polkadot/util/types"

/**
 * @name isStringHexString
 * @description Checks if a string is a hex string. Required to account for type differences between different polkadot libraries
 * @param {string} str - string to check
 * @returns {HexString} - hex string
 * @example
 * isStringHexString("0x1234") // "0x1234"
 * isStringHexString("1234") // Error: Expected a hex string
 * isStringHexString(1234) // Error: Expected a string
 **/
export const isStringHexString = (str: string): HexString => {
  if (typeof str !== "string") {
    throw new Error("Expected a string")
  }

  if (str.startsWith("0x")) {
    return str as HexString
  }
  throw new Error("Expected a hex string")
}
