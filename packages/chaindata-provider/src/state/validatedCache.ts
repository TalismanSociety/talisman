import type { Chaindata } from "./schema"

/**
 * Tracks objects that have already passed chaindata schema validation, so the expensive
 * validation (thousands of tokens) runs at most ONCE per object instead of on every
 * emission through the pipeline.
 *
 * Safe because parse output is immutable-by-convention in this package, and re-parsing
 * already-parsed data is idempotent (defaults filled, token key order already applied).
 */
const validated = new WeakSet<object>()

export const markChaindataValidated = (data: Chaindata): Chaindata => {
  validated.add(data)
  return data
}

export const isChaindataValidated = (data: unknown): data is Chaindata =>
  typeof data === "object" && data !== null && validated.has(data)
