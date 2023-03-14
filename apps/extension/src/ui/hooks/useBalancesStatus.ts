import { Balances } from "@talismn/balances"
import { getStaleChains } from "@ui/domains/Portfolio/StaleBalancesIcon"
import { useMemo } from "react"

export type BalancesStatus =
  | { status: "live" }
  | { status: "fetching" }
  | { status: "stale"; staleChains: string[] }

export const useBalancesStatus = (balances: Balances, isLoadingLocks?: boolean) =>
  useMemo<BalancesStatus>(() => {
    // stale
    const staleChains = getStaleChains(balances)
    if (staleChains.length > 0) return { status: "stale", staleChains }

    // fetching
    const hasCachedBalances = balances.each.some((b) => b.status === "cache")
    if (hasCachedBalances || isLoadingLocks) return { status: "fetching" }

    // live
    return { status: "live" }
  }, [balances, isLoadingLocks])
