import type { WalletTransaction } from "@core/domains/transactions/types"
import { type Balance, Balances } from "@talismn/balances"
import type { NetworkId } from "@talismn/chaindata-provider"
import { usePortfolioSymbolBalancesByFilter } from "@ui/domains/Portfolio/AssetsTable/usePortfolioSymbolBalances"
import { usePortfolioDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useNetworks } from "@ui/state/chaindata"
import { useNetworkDisplayNamesMapById } from "@ui/state/networkDisplay"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTransactions } from "@ui/state/transactions"
import { useMemo } from "react"

const PANEL_ROWS = 5

/** the symbol groups of the assets tables, the five worth most */
export const useAModeTopHoldings = (): Balances[] => {
  const { symbolBalances } = usePortfolioSymbolBalancesByFilter("all")
  const currency = useSelectedCurrency()

  return useMemo(
    () =>
      symbolBalances
        .map(([, balances]) => balances)
        .filter((balances) => balances.each.some((b) => b.total.planck > 0n))
        .map((balances) => ({ balances, fiat: balances.sum.fiat(currency).total }))
        .sort((a, b) => b.fiat - a.fiat)
        .slice(0, PANEL_ROWS)
        .map(({ balances }) => balances),
    [symbolBalances, currency]
  )
}

export type AModeNetworkShare = {
  networkId: NetworkId
  name: string
  fiat: number
  /** 0 to 1 of the portfolio total */
  share: number
}

export const useAModeTopNetworks = (): { networks: AModeNetworkShare[]; enabledCount: number } => {
  const balances = usePortfolioDisplayBalances("all")
  const names = useNetworkDisplayNamesMapById()
  const enabledCount = useNetworks({ activeOnly: true }).length
  const currency = useSelectedCurrency()

  const networks = useMemo(() => {
    const byNetwork = new Map<NetworkId, Balance[]>()
    for (const b of balances.each) {
      if (!b.networkId || b.total.planck === 0n) continue
      byNetwork.set(b.networkId, [...(byNetwork.get(b.networkId) ?? []), b])
    }
    const totals = [...byNetwork].map(([networkId, list]) => ({
      networkId,
      name: names[networkId] ?? networkId,
      fiat: new Balances(list).sum.fiat(currency).total,
    }))
    const total = totals.reduce((sum, n) => sum + n.fiat, 0)

    return totals
      .filter((n) => n.fiat > 0)
      .sort((a, b) => b.fiat - a.fiat)
      .slice(0, PANEL_ROWS)
      .map((n) => ({ ...n, share: total ? n.fiat / total : 0 }))
  }, [balances, names, currency])

  return { networks, enabledCount }
}

/** what the Activity page lists, newest first */
export const useAModeRecentActivity = (): WalletTransaction[] => {
  const transactions = useTransactions()
  return useMemo(() => transactions.slice(0, PANEL_ROWS), [transactions])
}
