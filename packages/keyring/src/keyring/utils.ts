// we dont want to reference @talismn/util in the keyring, so we copy this here
type HexString = `0x${string}`

export const REGEX_HEX_STRING = /^0x[0-9a-fA-F]*$/

export const isHexString = (value: unknown): value is HexString => {
  return typeof value === "string" && REGEX_HEX_STRING.test(value)
}
