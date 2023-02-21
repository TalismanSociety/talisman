import { AddressesByToken, BalanceModule, Balances } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useBalanceModules } from "./useBalanceModules"
import { useBalancesHydrate } from "./useBalancesHydrate"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

export function useBalances(addressesByToken: AddressesByToken<Token> | null) {
  // keep db data up to date
  useDbCacheSubscription("balances")

  const balanceModules = useBalanceModules()
  const { balances } = useDbCache()
  const hydrate = useBalancesHydrate()

  return useMemo(
    () =>
      new Balances(
        balances.filter((balance) => {
          // check that this balance is included in our queried balance modules
          if (!balanceModules.map(({ type }) => type).includes(balance.source)) return false

          // check that our query includes some tokens and addresses
          if (!addressesByToken) return false

          // check that this balance is included in our queried tokens
          if (!Object.keys(addressesByToken).includes(balance.tokenId)) return false

          // check that this balance is included in our queried addresses for this token
          if (!addressesByToken[balance.tokenId].includes(balance.address)) return false

          // keep this balance
          return true
        }),

        // hydrate balance chains, evmNetworks, tokens and tokenRates
        hydrate
      ),
    [balances, hydrate, balanceModules, addressesByToken]
  )
}
