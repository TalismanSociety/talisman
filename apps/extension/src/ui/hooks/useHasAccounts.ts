import { useMemo } from "react"

import { useAccountsSubscribe } from "./useAccountsSubscribe"

export const useHasAccounts = () => {
  const accounts = useAccountsSubscribe()
  return useMemo(() => Boolean(accounts && accounts.length > 0), [accounts])
}
