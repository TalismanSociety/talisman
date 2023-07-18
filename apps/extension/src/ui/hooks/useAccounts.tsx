import { AccountJsonAny, AccountType } from "@core/domains/accounts/types"
import { api } from "@ui/api"
import { useMemo } from "react"
import { BehaviorSubject } from "rxjs"

import { useMessageSubscription } from "./useMessageSubscription"

const INITIAL_VALUE: AccountJsonAny[] = []

const subscribe = (subject: BehaviorSubject<AccountJsonAny[]>) =>
  api.accountsSubscribe((v) => subject.next(v))

export type UseAccountsFilter = "all" | "watched" | "owned" | "portfolio" | "dapp" | "portal"

// TODO migrate to recoil
export const useAccounts = (filter: UseAccountsFilter = "all") => {
  const allAccounts = useMessageSubscription("accountsSubscribe", INITIAL_VALUE, subscribe)

  return useMemo(() => {
    switch (filter) {
      case "portfolio":
        return allAccounts.filter(
          ({ origin, isPortfolio }) => origin !== AccountType.Watched || isPortfolio
        )
      case "watched":
        return allAccounts.filter(({ origin }) => origin === AccountType.Watched)
      case "dapp":
      case "owned":
        return allAccounts.filter(({ origin }) => origin !== AccountType.Watched)
      case "portal":
      case "all":
        return allAccounts
    }
  }, [allAccounts, filter])
}

export default useAccounts
