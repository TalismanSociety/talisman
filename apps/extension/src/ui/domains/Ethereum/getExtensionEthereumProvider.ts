import { log } from "@core/log"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { ethers } from "ethers"
import { PublicClient, createPublicClient, custom } from "viem"

type ViemRequest = (method: string, params?: unknown[]) => Promise<unknown>

const ethereumRequest =
  (chainId: EvmNetworkId): ViemRequest =>
  async (method: string, params?: unknown[]) => {
    try {
      return await api.ethRequest({ chainId, method, params })
    } catch (err) {
      log.error("[provider.request] error on %s", method, { err })
      throw err
      // TODO check that we get proper error codes
      // const { message, code, data } = err as EthProviderRpcError
      // throw new EthProviderRpcError(message, code ?? ETH_ERROR_EIP1474_INTERNAL_ERROR, data)
    }
  }

export const getExtensionEthereumProvider = (evmNetworkId: EvmNetworkId) => {
  return new ethers.providers.Web3Provider(ethereumRequest(evmNetworkId))
}

export const getExtensionPublicClient = (evmNetworkId: EvmNetworkId): PublicClient => {
  return createPublicClient({
    // TODO check timers, decide if they should be here (remove them on backend) or clear them here and use defaults on backend
    transport: custom({
      request: ethereumRequest(evmNetworkId),
    }),
  })
}
