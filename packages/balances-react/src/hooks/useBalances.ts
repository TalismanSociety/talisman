import { Balances } from "@talismn/balances"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useEffect, useMemo } from "react"

import { allAddressesAtom } from "../atoms/allAddresses"
import { allBalancesAtom, balancesPersistBackendAtom } from "../atoms/balances"
import { BalancesPersistBackend } from "../util/balancesPersist"

export const useSetBalancesAddresses = (addresses: string[]) => {
  const setAllAddresses = useSetAtom(allAddressesAtom)
  useEffect(() => {
    setAllAddresses((a) => (JSON.stringify(a) === JSON.stringify(addresses) ? a : addresses))
  }, [addresses, setAllAddresses])
}

/**
 * @name useBalances
 * @description Hook to get the current balances state.
 * @param persistBackend an optional BalancesPersistBackend backend to use for persisting the balances state. By default, indexedDB is used.
 * @returns a Balances object containing the current balances state.
 */

export const useBalances = (persistBackend?: BalancesPersistBackend) => {
  const [, setPersistBackend] = useAtom(balancesPersistBackendAtom)
  if (persistBackend) setPersistBackend(persistBackend)
  return useAtomValue(allBalancesAtom)
}

// TODO: Extract to shared definition between extension and @talismn/balances-react
export type BalancesStatus =
  | { status: "live" }
  | { status: "fetching" }
  | { status: "stale"; staleChains: string[] }

/**
 * Given a collection of `Balances`, this hook returns a `BalancesStatus` summary for the collection.
 *
 * @param balances The collection of balances to get the status from.
 * @returns An instance of `BalancesStatus` which represents the status of the balances collection.

 */
export const useBalancesStatus = (balances: Balances) =>
  useMemo<BalancesStatus>(() => {
    // stale
    const staleChains = getStaleChains(balances)
    if (staleChains.length > 0) return { status: "stale", staleChains }

    // fetching
    const hasCachedBalances = balances.each.some((b) => b.status === "cache")
    if (hasCachedBalances) return { status: "fetching" }

    // live
    return { status: "live" }
  }, [balances])

export const getStaleChains = (balances: Balances): string[] => [
  ...new Set(
    balances.sorted
      .filter((b) => b.status === "stale")
      .map((b) => b.chain?.name ?? b.chainId ?? "Unknown")
  ),
]
