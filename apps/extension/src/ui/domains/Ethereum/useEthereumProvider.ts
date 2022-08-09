import { JsonRpcProvider } from "@ethersproject/providers"
import { getExtensionEthereumProvider } from "@ui/domains/Ethereum/getExtensionEthereumProvider"
import { ethers } from "ethers"
import { useMemo } from "react"

export const useEthereumProvider = (
  evmNetworkId?: number
): ethers.providers.JsonRpcProvider | undefined => {
  const provider = useMemo(() => {
    if (!evmNetworkId) return undefined
    return getExtensionEthereumProvider(evmNetworkId)
  }, [evmNetworkId])

  return provider
}
