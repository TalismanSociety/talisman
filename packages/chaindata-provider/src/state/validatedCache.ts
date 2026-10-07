import type { ChunkedOptions } from "@talismn/util"

import { type ChunkedParseResult, parseChaindataFileChunked } from "./chunkedValidation"
import type { Chaindata } from "./schema"

/**
 * Validation results by input object, so the expensive validation (thousands of tokens)
 * runs at most ONCE per object instead of on every emission or resubscription.
 *
 * Safe because chaindata objects are immutable by convention in this package, and a valid
 * output maps to its own result: re-parsing already-parsed data is idempotent (defaults
 * filled, token key order already applied).
 */
const results = new WeakMap<object, ChunkedParseResult<Chaindata>>()

export const validateChaindata = async (
  data: unknown,
  options?: ChunkedOptions
): Promise<ChunkedParseResult<Chaindata>> => {
  if (typeof data !== "object" || data === null) return parseChaindataFileChunked(data, options)

  const cached = results.get(data)
  if (cached) return cached

  const result = await parseChaindataFileChunked(data, options)
  results.set(data, result)
  if (result.success) results.set(result.data, result)
  return result
}
