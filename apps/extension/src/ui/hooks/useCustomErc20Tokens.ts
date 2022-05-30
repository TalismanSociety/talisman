// TODO subscription

import { CustomErc20Token } from "@core/types"
import { api } from "@ui/api"
import sortBy from "lodash/sortBy"
import { useCallback, useEffect, useState } from "react"

export const useCustomErc20Tokens = () => {
  const [customErc20Tokens, setCustomErc20Tokens] = useState<CustomErc20Token[]>()

  const refresh = useCallback(async () => {
    const customTokens = await api.customErc20Tokens()
    setCustomErc20Tokens(sortBy(Object.values(customTokens), ["symbol"]))
  }, [])

  useEffect(() => {
    refresh()

    // execute only on mount (empty deps array)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { customErc20Tokens, refresh }
}
