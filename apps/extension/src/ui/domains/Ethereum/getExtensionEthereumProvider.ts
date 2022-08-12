import {
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
  EthProviderRpcError,
  EthRequestSignatures,
  EthRequestTypes,
} from "@core/injectEth/types"
import { api } from "@ui/api"
import { ethers } from "ethers"

const ethereumRequest =
  (chainId: number): ethers.providers.JsonRpcFetchFunc =>
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

export const getExtensionEthereumProvider = (evmNetworkId: number) => {
  return new ethers.providers.Web3Provider(ethereumRequest(evmNetworkId))
}
