import { useCallback, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"

const useManageAccountsProvider = () => {
  const [{ search, isReordering }, setState] = useState<{ search: string; isReordering: boolean }>({
    search: "",
    isReordering: false,
  })

  const onSearchChange = useCallback((value: string) => {
    setState((state) => ({ ...state, search: value }))
  }, [])

  const onToggleReorder = useCallback(() => {
    setState((state) => ({ isReordering: !state.isReordering, search: "" }))
  }, [])

  return { search, isReordering, onSearchChange, onToggleReorder }
}

export const [ManageAccountsProvider, useManageAccounts] = provideContext(useManageAccountsProvider)
