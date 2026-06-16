/**
 * @name stripHexPrefix
 * @description Removes a leading `0x` prefix from a string, if present.
 * @param {string} str - string to strip
 * @returns {string} - the string without its leading `0x` prefix
 * @example
 * stripHexPrefix("0x1234") // "1234"
 * stripHexPrefix("1234") // "1234"
 **/
export const stripHexPrefix = (str: string): string => (str.startsWith("0x") ? str.slice(2) : str)
