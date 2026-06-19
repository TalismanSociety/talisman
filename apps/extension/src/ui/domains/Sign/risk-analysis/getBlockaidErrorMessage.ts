// @blockaid/client gets bundled into multiple chunks, so `instanceof APIError` is unreliable
// across module copies (see apps/extension/src/__tests__/no-instanceof-bundled-class.test.ts).
// APIError also does not set a stable `.name` (it inherits Error's "Error"), so name-matching
// would not work either — duck-type the error response shape instead.
type BlockaidApiErrorShape = {
  error?: { detail?: Array<{ msg?: string } | undefined> } | undefined
}

/**
 * Returns the first Blockaid API error detail message when the caught error looks like a
 * Blockaid `APIError`, otherwise `undefined`. Safe to call with any caught value.
 */
export const getBlockaidErrorMessage = (err: unknown): string | undefined => {
  if (!err || typeof err !== "object") return undefined
  const detail = (err as BlockaidApiErrorShape).error?.detail
  return Array.isArray(detail) ? detail[0]?.msg : undefined
}
