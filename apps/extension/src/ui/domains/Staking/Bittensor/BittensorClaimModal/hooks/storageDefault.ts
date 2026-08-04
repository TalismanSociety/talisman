import type { ScaleApi } from "@talismn/sapi"

/** storage values decode as bigint (u64) but guard against number decodes */
export const toBigIntStrict = (value: unknown): bigint => {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isInteger(value)) return BigInt(value)
  throw new Error(`Expected an integer storage value, got ${typeof value}`)
}

/**
 * An absent storage entry means the chain applies the metadata default, so reads must too.
 * Root Reborn ships `RootClaimableThreshold` unset with a sentinel default (~2.1M TAO) that
 * dust-skips every claim: claiming stays disabled network-wide until governance sets it.
 *
 * A missing or undecodable fallback throws so the query errors: reading it as zero would
 * bypass the sentinel gate and let the user pay for a no-op claim.
 */
export const getStorageDefault = (sapi: ScaleApi, pallet: string, entry: string): bigint => {
  const item = sapi.chain.metadata.pallets
    .find((p) => p.name === pallet)
    ?.storage?.items.find((i) => i.name === entry)
  if (!item?.fallback) throw new Error(`No metadata fallback for ${pallet}.${entry}`)
  const coder = sapi.chain.builder.buildStorage(pallet, entry)
  return toBigIntStrict(coder.value.dec(item.fallback))
}
