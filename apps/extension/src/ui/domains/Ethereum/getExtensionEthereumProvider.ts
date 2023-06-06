import {
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
  EthProviderRpcError,
} from "@core/injectEth/EthProviderRpcError"
import { EthRequestSignatures, EthRequestTypes } from "@core/injectEth/types"
import { log } from "@core/log"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { ethers } from "ethers"

const ethereumRequest =
  (chainId: EvmNetworkId): ethers.providers.JsonRpcFetchFunc =>
  async (method: string, params?: unknown[]) => {
    try {
      return await api.ethRequest({
        chainId,
        method: method as keyof EthRequestSignatures,
        params: params as EthRequestSignatures[EthRequestTypes][0],
      })
    } catch (err) {
      log.error("[provider.request] error on %s", method, { err })

      const { message, code, data } = err as EthProviderRpcError
      throw new EthProviderRpcError(message, code ?? ETH_ERROR_EIP1474_INTERNAL_ERROR, data)
    }
  }

export const getExtensionEthereumProvider = (evmNetworkId: EvmNetworkId) => {
  return new ethers.providers.Web3Provider(ethereumRequest(evmNetworkId))
}
