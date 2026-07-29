import { log } from "@common/log"
import type { EthNetwork, EthNetworkId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { useNetworkById } from "@ui/state/chaindata"
import { useMemo } from "react"
import { createPublicClient, custom, type PublicClient } from "viem"

type ViemRequest = (arg: { method: string; params?: unknown[] }) => Promise<unknown>

const viemRequest =
  (chainId: EthNetworkId): ViemRequest =>
  async ({ method, params }) => {
    // Since viem 2.40, prepareTransactionRequest attempts eth_fillTransaction before its classic
    // estimation path, but not all RPCs implement this method reliably. Answering "method not
    // found" makes viem mark it as unsupported and fall back to its classic estimation path.
    if (method === "eth_fillTransaction")
      throw Object.assign(
        new Error("the method eth_fillTransaction does not exist/is not available"),
        {
          code: -32601,
        }
      )

    try {
      return await api.ethRequest({ chainId, method, params })
    } catch (err) {
      log.error("publicClient request error : %s", method, { err })
      throw err
    }
  }

export const getExtensionPublicClient = (evmNetwork: EthNetwork): PublicClient => {
  const name = evmNetwork.name ?? `EVM Chain ${evmNetwork.id}`

  return createPublicClient({
    chain: {
      id: Number(evmNetwork.id),
      name: name,
      network: name,
      nativeCurrency: evmNetwork.nativeCurrency,
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
      }
    ),
  })
}

export const usePublicClient = (evmNetworkId?: EthNetworkId): PublicClient | undefined => {
  const evmNetwork = useNetworkById(evmNetworkId, "ethereum")

  const publicClient = useMemo(() => {
    if (!evmNetwork) return undefined
    return getExtensionPublicClient(evmNetwork)
  }, [evmNetwork])

  return publicClient
}
