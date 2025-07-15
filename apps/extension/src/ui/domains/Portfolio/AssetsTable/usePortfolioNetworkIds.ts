import { Balances } from "@talismn/balances"
import { NetworkId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

export const usePortfolioNetworkIds = (balances: Balances) => {
  return useMemo<NetworkId[]>(
    () =>
      [...new Set(balances.each.filter((b) => b.total.planck > 0).map((b) => b.networkId))].filter(
        isNotNil,
      ),
    [balances],
  )
}
