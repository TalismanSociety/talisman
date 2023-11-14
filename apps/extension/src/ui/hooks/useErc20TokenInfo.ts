import { EvmAddress } from "@core/domains/ethereum/types"
import { CustomErc20TokenCreate } from "@core/domains/tokens/types"
import { getErc20TokenInfo } from "@core/util/getErc20TokenInfo"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useEffect, useState } from "react"

export const useErc20TokenInfo = (evmNetworkId?: EvmNetworkId, contractAddress?: EvmAddress) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [token, setToken] = useState<CustomErc20TokenCreate>()

  const publicClient = usePublicClient(evmNetworkId)

  useEffect(() => {
    setError(undefined)
    setToken(undefined)
    if (!evmNetworkId || !publicClient || !contractAddress) return
    setIsLoading(true)
    getErc20TokenInfo(publicClient, evmNetworkId, contractAddress)
      .then(setToken)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [contractAddress, evmNetworkId, publicClient])

  return { isLoading, error, token }
}
