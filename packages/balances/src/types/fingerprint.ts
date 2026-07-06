import type { BalancesResult } from "../BalancesProvider"
import type { IBalance, MiniMetadata } from "."
import type { FetchBalanceResults } from "./IBalanceModule"

/**
 * Cheap change-detection for the high-frequency balance pipelines, replacing lodash
 * `isEqual` deep walks that previously ran on every block/poll emission at several
 * stacked pipeline stages.
 *
 * Each freshly-decoded balance object is serialized ONCE (WeakMap-cached JSON.stringify),
 * then every comparison against it — at the module stage, the network stage and the
 * aggregate stage — is a string compare against the cached fingerprint of the previous
 * emission's objects (already cached from their own emission).
 */

const fingerprints = new WeakMap<IBalance, string>()

/** WeakMap-cached JSON serialization of a balance */
export const getBalanceFingerprint = (balance: IBalance): string => {
  let fingerprint = fingerprints.get(balance)
  if (fingerprint === undefined) {
    fingerprint = JSON.stringify(balance)
    fingerprints.set(balance, fingerprint)
  }
  return fingerprint
}

const storageFingerprints = new WeakMap<IBalance, string>()

/**
 * Status-agnostic variant: stored balances carry status "cache" while fresh results carry
 * "live", so comparisons between incoming results and stored entries must ignore status.
 */
export const getBalanceStorageFingerprint = (balance: IBalance): string => {
  let fingerprint = storageFingerprints.get(balance)
  if (fingerprint === undefined) {
    fingerprint = JSON.stringify({ ...balance, status: undefined })
    storageFingerprints.set(balance, fingerprint)
  }
  return fingerprint
}

export const isEqualBalanceArrays = (a: IBalance[], b: IBalance[]): boolean => {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i] && getBalanceFingerprint(a[i]) !== getBalanceFingerprint(b[i])) return false
  }
  return true
}

const isEqualStringArrays = (a: string[], b: string[]): boolean =>
  a === b || (a.length === b.length && a.every((value, i) => value === b[i]))

/** replaces distinctUntilChanged(isEqual) on BalancesResult streams */
export const isEqualBalancesResult = (a: BalancesResult, b: BalancesResult): boolean =>
  a.status === b.status &&
  isEqualStringArrays(a.failedBalanceIds, b.failedBalanceIds) &&
  isEqualBalanceArrays(a.balances, b.balances)

/**
 * Replaces distinctUntilChanged(isEqual) on module poll streams.
 * Errors are compared by (tokenId, address) and dynamic tokens by id — slightly MORE
 * dedupe than lodash isEqual (which compared Error instances), which is desirable: a
 * fresh-but-identical Error on every failing poll should not re-emit.
 */
export const isEqualModuleResults = (a: FetchBalanceResults, b: FetchBalanceResults): boolean =>
  a.errors.length === b.errors.length &&
  a.errors.every(
    (error, i) => error.tokenId === b.errors[i].tokenId && error.address === b.errors[i].address
  ) &&
  (a.dynamicTokens?.length ?? 0) === (b.dynamicTokens?.length ?? 0) &&
  (a.dynamicTokens ?? []).every((token, i) => token.id === b.dynamicTokens?.[i]?.id) &&
  isEqualBalanceArrays(a.success, b.success)

/**
 * Replaces distinctUntilChanged(isEqual) on MiniMetadata[] streams: id encodes
 * (source, chainId, specVersion, version) and data is the metadata hex, so comparing
 * those by === replaces a deep walk over large metadata strings and `extra` objects.
 */
export const isEqualMiniMetadatas = (
  a: MiniMetadata[] | null,
  b: MiniMetadata[] | null
): boolean => {
  if (a === b) return true
  if (a === null || b === null) return false
  return a.length === b.length && a.every((m, i) => m.id === b[i].id && m.data === b[i].data)
}
