/**
 * @name validateHexString
 * @description Checks if a string is a hex string. Required to account for type differences between different polkadot libraries
 * @param {string} str - string to check
 * @returns {`0x${string}`} - boolean
 * @example
 * validateHexString("0x1234") // "0x1234"
 * validateHexString("1234") // Error: Expected a hex string
 * validateHexString(1234) // Error: Expected a string
 **/
export const validateHexString = (str: string): `0x${string}` => {
  if (typeof str !== "string") {
    throw new Error("Expected a string")
  }

  if (str.startsWith("0x")) {
    return str as `0x${string}`
  }
  throw new Error("Expected a hex string")
}
