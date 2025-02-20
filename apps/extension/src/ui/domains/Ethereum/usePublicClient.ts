import { EvmNativeToken } from "@talismn/balances"
import { EvmNetwork, EvmNetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"
import { createPublicClient, custom, PublicClient } from "viem"

import { log } from "@extension/shared"
import { api } from "@ui/api"
import { useEvmNetwork, useToken } from "@ui/state"

type ViemRequest = (arg: { method: string; params?: unknown[] }) => Promise<unknown>

const viemRequest =
  (chainId: EvmNetworkId): ViemRequest =>
  async ({ method, params }) => {
    try {
      return await api.ethRequest({ chainId, method, params })
    } catch (err) {
      log.error("publicClient request error : %s", method, { err })
      throw err
    }
  }

export const getExtensionPublicClient = (
  evmNetwork: EvmNetwork,
  nativeToken: EvmNativeToken,
): PublicClient => {
  const name = evmNetwork.name ?? `EVM Chain ${evmNetwork.id}`

  return createPublicClient({
    chain: {
      id: Number(evmNetwork.id),
      name: name,
      network: name,
      nativeCurrency: {
        symbol: nativeToken.symbol,
        decimals: nativeToken.decimals,
        name: nativeToken.symbol,
      },
      rpcUrls: {
        // rpcs are a typescript requirement, but won't be used by the custom transport
        public: { http: [] },
        default: { http: [] },
      },
    },
    transport: custom(
      {
        request: viemRequest(evmNetwork.id),
      },
      {
        // backend will retry, at it's own transport level
        retryCount: 0,
      },
    ),
  })
}

export const usePublicClient = (evmNetworkId?: EvmNetworkId): PublicClient | undefined => {
  const evmNetwork = useEvmNetwork(evmNetworkId)
  const nativeToken = useToken(evmNetwork?.nativeToken?.id)

  const publicClient = useMemo(() => {
    if (!evmNetwork || nativeToken?.type !== "evm-native") return undefined
    return getExtensionPublicClient(evmNetwork, nativeToken)
  }, [evmNetwork, nativeToken])

  return publicClient
}
