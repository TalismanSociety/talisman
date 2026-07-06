export const ERROR_NO_MINT = "No mint info available"
export const ERROR_NO_METADATA = "No metadata account found"
export const ERROR_INVALID_DATA = "Invalid on-chain data"

/** True when the message is one of the sentinel errors that map to an `isValid: false` cache entry. */
export const isTokenDataError = (msg: string): boolean =>
  [ERROR_NO_MINT, ERROR_NO_METADATA, ERROR_INVALID_DATA].includes(msg)
