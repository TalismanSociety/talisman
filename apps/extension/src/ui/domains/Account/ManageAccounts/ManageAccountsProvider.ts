import { provideContext } from "@ui/util/provideContext"
import { useCallback, useState } from "react"

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
