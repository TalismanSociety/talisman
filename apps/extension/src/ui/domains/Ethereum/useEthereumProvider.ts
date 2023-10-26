import { EvmNetworkId } from "@core/domains/ethereum/types"
import {
  getExtensionEthereumProvider,
  getExtensionPublicClient,
} from "@ui/domains/Ethereum/getExtensionEthereumProvider"
import { ethers } from "ethers"
import { useMemo } from "react"
import { PublicClient } from "viem"

/**
 * @deprecated use usePublicClient instead
 */
export const useEthereumProvider = (
  evmNetworkId?: EvmNetworkId
): ethers.providers.JsonRpcProvider | undefined => {
  const provider = useMemo(() => {
    if (!evmNetworkId) return undefined
    return getExtensionEthereumProvider(evmNetworkId)
  }, [evmNetworkId])

  return provider
}

export const usePublicClient = (evmNetworkId?: EvmNetworkId): PublicClient | undefined => {
  const publicClient = useMemo(() => {
    if (!evmNetworkId) return undefined
    return getExtensionPublicClient(evmNetworkId)
  }, [evmNetworkId])

  return publicClient
}
