import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type UseGetBittensorAcceptsLockedAlphaInputs = {
  networkId: DotNetworkId | null | undefined
  address: string | null | undefined
}

// bit 0 of SubtensorModule.AccountFlags: set = coldkey opted in to receive locked alpha
const ACCOUNT_FLAGS_ACCEPT_LOCKED_ALPHA = 1n

/**
 * Normalize a decoded `AccountFlags` value to a bigint bitfield.
 *
 * `getStorage<T>` only casts — the runtime shape depends on the chain's `AccountFlags` type, which
 * polkadot-api decodes as bigint (u64+) or number (smaller ints). Coerce both so the bitwise check
 * can't throw `Cannot mix BigInt and other types` on a number decode. Returns null for an
 * unexpected shape (e.g. a struct) so callers treat it as unknown rather than silently misreading.
 */
const toBitfield = (value: unknown): bigint | null => {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isInteger(value)) return BigInt(value)
  if (typeof value === "boolean") return value ? 1n : 0n
  return null
}

/**
 * A pre-spec-421 runtime has no `SubtensorModule.AccountFlags` storage item, so the metadata lookup
 * inside `getStorage` dereferences `undefined` and throws a TypeError (or, on a newer polkadot-api,
 * an Error whose message says the entry isn't found). Only that means "unsupported"; a transient
 * RPC or decode error must propagate so it isn't mistaken for the flag being off.
 */
const isAccountFlagsUnsupported = (err: unknown): boolean => {
  if (err instanceof TypeError) return true
  const message = err instanceof Error ? err.message : String(err)
  return /not found/i.test(message)
}

/**
 * Reads whether a coldkey has opted in to receive conviction-locked alpha (spec 421+).
 *
 * Since spec 421, a `transfer_stake` whose amount exceeds the sender's available (unlocked) stake
 * carries the lock + pro-rata conviction to the recipient — and the chain REVERTS it with
 * `AccountRejectsLockedAlpha` unless the destination coldkey opted in via
 * `set_reject_locked_alpha(false)`. Coldkeys reject by default.
 *
 * Returns:
 * - `true`  — opted in, the locked transfer will go through
 * - `false` — rejects (the default; storage key absent reads as 0 = reject)
 * - `null`  — unknown: older runtime without the `AccountFlags` storage item, an unexpected decode
 *             shape, or no address. Callers must NOT block on `null` (pre-421 chains allow it).
 *
 * A transient RPC/decode error is NOT swallowed as `null` — the query enters its error state and
 * retries, so a momentary failure can't be misread as "the recipient accepts".
 */
export const useGetBittensorAcceptsLockedAlpha = ({
  networkId,
  address,
}: UseGetBittensorAcceptsLockedAlphaInputs) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useGetBittensorAcceptsLockedAlpha", sapi?.id, address],
    queryFn: async (): Promise<boolean | null> => {
      if (!sapi || !address) return null

      let flags: unknown
      try {
        flags = await sapi.getStorage("SubtensorModule", "AccountFlags", [address])
      } catch (err) {
        if (isAccountFlagsUnsupported(err)) return null
        throw err // transient RPC/decode error: surface it, don't pretend the flag is off
      }

      // ValueQuery default 0: an absent key (null) means no accept bit => rejects
      if (flags == null) return false

      const bitfield = toBitfield(flags)
      if (bitfield === null) return null // unexpected decode shape: can't read reliably => unknown

      return (bitfield & ACCOUNT_FLAGS_ACCEPT_LOCKED_ALPHA) === ACCOUNT_FLAGS_ACCEPT_LOCKED_ALPHA
    },
    enabled: !!sapi && !!address,
    refetchInterval: 12_000,
  })
}
