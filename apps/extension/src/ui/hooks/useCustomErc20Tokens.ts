import { CustomErc20Token } from "@core/types"
import { api } from "@ui/api"
import sortBy from "lodash/sortBy"
import { useCallback, useEffect, useState } from "react"

export const useCustomErc20Tokens = () => {
  const [tokens, setTokens] = useState<CustomErc20Token[]>()

  const refresh = useCallback(async () => {
    // TODO subscription
    const customTokens = await api.customErc20Tokens()
    setTokens(sortBy(Object.values(customTokens), ["symbol"]))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { tokens, refresh }
}
