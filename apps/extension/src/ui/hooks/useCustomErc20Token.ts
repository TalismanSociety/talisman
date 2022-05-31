import { CustomErc20Token } from "@core/types"
import { api } from "@ui/api"
import { useCallback, useEffect, useMemo, useState } from "react"

export const useCustomErc20Token = (id: string | undefined) => {
  const [token, setToken] = useState<CustomErc20Token | null>()

  const refresh = useCallback(async () => {
    if (!id) {
      setToken(null)
      return
    }
    // TODO subscription
    setToken(await api.customErc20Token(id))
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { token, refresh }
}
