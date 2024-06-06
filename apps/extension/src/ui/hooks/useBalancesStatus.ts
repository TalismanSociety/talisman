import { Balances } from "@talismn/balances"
import { useMemo } from "react"

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
      .map((b) => (b.chain?.name || b.evmNetwork?.name) ?? b.chainId ?? "Unknown")
  ),
]
