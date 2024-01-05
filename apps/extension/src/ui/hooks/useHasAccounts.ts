import { useMemo } from "react"

import useAccounts from "./useAccounts"

export const useHasAccounts = () => {
  const accounts = useAccounts()
  return useMemo(() => !!accounts.length, [accounts])
}
