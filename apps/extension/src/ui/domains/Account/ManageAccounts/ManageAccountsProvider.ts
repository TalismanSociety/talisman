import { useCallback, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"

const useManageAccountsProvider = () => {
  const [{ search }, setState] = useState<{ search: string }>({
    search: "",
  })

  const onSearchChange = useCallback((value: string) => {
    setState((state) => ({ ...state, search: value }))
  }, [])

  return { search, onSearchChange }
}

export const [ManageAccountsProvider, useManageAccounts] = provideContext(useManageAccountsProvider)
