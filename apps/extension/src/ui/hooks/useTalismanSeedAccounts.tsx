import { AccountType, storedSeedAccountTypes } from "@core/domains/accounts/types"
import { useMemo } from "react"

import useAccounts from "./useAccounts"

export const useTalismanSeedAccounts = () => {
  const accounts = useAccounts()

  return useMemo(() => {
    const seedAccount = accounts.find(
      ({ origin }) => origin && storedSeedAccountTypes.includes(origin)
    )

    // put it in an array to get return typing right
    const sa = seedAccount ? [seedAccount] : []
    // even if the root seed account has been deleted, its children could still be there
    return [...sa, ...accounts.filter((acc) => acc.origin === AccountType.Derived && acc.parent)]
  }, [accounts])
}
