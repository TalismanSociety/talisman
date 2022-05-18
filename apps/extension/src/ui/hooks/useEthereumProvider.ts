import { JsonRpcProvider, JsonRpcFetchFunc } from "@ethersproject/providers"
import { ethers } from "ethers"
import { useMemo } from "react"
import {
  EthProviderRpcError,
  EthRequestSignatures,
  EthRequestTypes,
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
} from "@core/injectEth/types"
import { api } from "@ui/api"

const ethereumRequest =
  (chainId: number): JsonRpcFetchFunc =>
  async (method: string, params?: any[]) => {
    try {
      return await api.ethRequest({
        chainId,
        method: method as keyof EthRequestSignatures,
        params: params as EthRequestSignatures[EthRequestTypes][0],
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      if (err instanceof EthProviderRpcError) {
        const { code, message, name } = err
        // eslint-disable-next-line no-console
        console.debug("[provider.request] RPC error on %s", method, { code, message, name })
        throw err
      }
      // eslint-disable-next-line no-console
      console.debug("[provider.request] error on %s", method, err)

      throw new EthProviderRpcError((err as Error).message, ETH_ERROR_EIP1474_INTERNAL_ERROR)
    }
  }

export const useEthereumProvider = (ethChainId?: number): JsonRpcProvider | undefined => {
  const provider = useMemo(() => {
    if (!ethChainId) return undefined
    return new ethers.providers.Web3Provider(ethereumRequest(ethChainId))
  }, [ethChainId])

  return provider
}
