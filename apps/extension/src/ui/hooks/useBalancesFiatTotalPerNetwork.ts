import { Balances } from "@talismn/balances"
import { useMemo } from "react"

import { useSelectedCurrency } from "./useCurrency"

export const useBalancesFiatTotalPerNetwork = (balances: Balances) => {
  const currency = useSelectedCurrency()

  return useMemo<Record<string, number>>(() => {
    const chainIds = new Set<string>()
    const evmNetworkIds = new Set<string>()

    for (const b of balances.each) {
      if (b.chainId) chainIds.add(b.chainId)
      if (b.evmNetworkId) evmNetworkIds.add(b.evmNetworkId)
    }

    return Object.fromEntries(
      [...chainIds]
        .map((id) => [id, balances.find({ chainId: id }).sum.fiat(currency).total])
        .concat(
          [...evmNetworkIds].map((id) => [
            id,
            balances.find({ evmNetworkId: id }).sum.fiat(currency).total,
          ])
        )
    )
  }, [balances, currency])
}
