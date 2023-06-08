import { Balances } from "@talismn/balances"
import { useMemo } from "react"

import useAccounts from "./useAccounts"
import useBalances from "./useBalances"

export const useMyBalances = () => {
  const balances = useBalances()
  const accounts = useAccounts()

  const myAccountAddresses = useMemo(
    () =>
      accounts
        .filter(({ origin, isPortfolio }) => origin !== "WATCHED" || isPortfolio)
        .map(({ address }) => address),
    [accounts]
  )

  const myBalances = useMemo(() => {
    return new Balances(
      balances.each.filter((balance) => myAccountAddresses.includes(balance.address))
    )
  }, [balances, myAccountAddresses])

  return myBalances
}
