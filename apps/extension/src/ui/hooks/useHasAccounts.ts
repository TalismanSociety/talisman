import { useMemo } from "react"

import { useAccountsSubscribe } from "./useAccountsSubscribe"

export const useHasAccounts = () => {
  const accounts = useAccountsSubscribe()
  const hasAccounts = useMemo(() => accounts && accounts.length > 0, [accounts])
  return hasAccounts
}
