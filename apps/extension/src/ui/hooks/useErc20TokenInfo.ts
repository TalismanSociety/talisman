import { CustomErc20TokenCreate } from "@core/types"
import { getErc20TokenInfo } from "@core/util/getErc20TokenInfo"
import { useEffect, useState } from "react"
import { useEthereumProvider } from "./useEthereumProvider"

export const useErc20TokenInfo = (evmNetworkId?: number, contractAddress?: string) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [token, setToken] = useState<CustomErc20TokenCreate>()

  const provider = useEthereumProvider(evmNetworkId)

  useEffect(() => {
    setError(undefined)
    setToken(undefined)
    if (!evmNetworkId || !provider || !contractAddress) return
    setIsLoading(true)
    getErc20TokenInfo(provider, evmNetworkId, contractAddress)
      .then(setToken)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [contractAddress, evmNetworkId, provider])

  return { isLoading, error, token }
}
