import {
  EthProviderRpcError,
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
} from "@core/injectEth/EthProviderRpcError"
import { EthRequestSignatures, EthRequestTypes } from "@core/injectEth/types"
import { log } from "@core/log"
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
      log.error("[provider.request] error on %s", method, (err as Error).message)

      throw new EthProviderRpcError((err as Error).message, ETH_ERROR_EIP1474_INTERNAL_ERROR)
    }
  }

export const getExtensionEthereumProvider = (evmNetworkId: number) => {
  return new ethers.providers.Web3Provider(ethereumRequest(evmNetworkId))
}
