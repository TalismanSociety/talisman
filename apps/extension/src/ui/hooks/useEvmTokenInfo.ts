import { CustomEvmTokenCreate } from "@extension/core"
import { EvmAddress } from "@extension/core"
import { getErc20TokenInfo } from "@extension/core/util/getErc20TokenInfo"
import { getUniswapV2TokenInfo } from "@extension/core/util/getUniswapV2TokenInfo"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { useEffect, useState } from "react"
import { ContractFunctionExecutionError } from "viem"

export const useEvmTokenInfo = (evmNetworkId?: EvmNetworkId, contractAddress?: EvmAddress) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>()
  const [token, setToken] = useState<CustomEvmTokenCreate>()

  const publicClient = usePublicClient(evmNetworkId)

  useEffect(() => {
    setError(undefined)
    setToken(undefined)
    if (!evmNetworkId || !publicClient || !contractAddress) return
    setIsLoading(true)

    const aborted = new AbortController()
    ;(async () => {
      try {
        try {
          // try uniswapv2 contract
          const token = await getUniswapV2TokenInfo(publicClient, evmNetworkId, contractAddress)
          if (aborted.signal.aborted) return
          setToken(token)
        } catch (cause) {
          if (!(cause instanceof ContractFunctionExecutionError)) throw cause
          if (aborted.signal.aborted) return

          // try erc20 contract
          const token = await getErc20TokenInfo(publicClient, evmNetworkId, contractAddress)
          if (aborted.signal.aborted) return
          setToken(token)
        }
      } catch (cause) {
        setError(cause)
      } finally {
        setIsLoading(false)
      }
    })()

    return () => aborted.abort()
  }, [contractAddress, evmNetworkId, publicClient])

  return { isLoading, error, token }
}
