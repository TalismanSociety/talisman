import { Balances } from "@talismn/balances"
import { allBalancesState } from "@ui/atoms"
import { useMemo } from "react"
import { useRecoilValue } from "recoil"

import { UseAccountsFilter, useAccounts } from "./useAccounts"

// TODO migrate useAccounts to recoil so this hook could just call a recoil selector
export const useBalances = (accountsFilter: UseAccountsFilter = "all") => {
  const balances = useRecoilValue(allBalancesState)
  const accounts = useAccounts(accountsFilter)

  return useMemo(
    () => new Balances(balances.each.filter((b) => accounts.some((a) => a.address === b.address))),
    [accounts, balances]
  )
}
export default useBalances
