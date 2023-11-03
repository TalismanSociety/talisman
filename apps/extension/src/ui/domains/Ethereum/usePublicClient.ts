import { EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { log } from "@core/log"
import { EvmNativeToken } from "@talismn/balances-evm-native"
import { api } from "@ui/api"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { useMemo } from "react"
import { PublicClient, createPublicClient, custom } from "viem"

type ViemRequest = (arg: { method: string; params?: unknown[] }) => Promise<unknown>

const viemRequest =
  (chainId: EvmNetworkId): ViemRequest =>
  async ({ method, params }) => {
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

export const getExtensionPublicClient = (
  evmNetwork: EvmNetwork,
  nativeToken: EvmNativeToken
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
        // rpcs are a typescript requirement, won't be used by the custom transport
        public: { http: [] },
        default: { http: [] },
      },
    },
    // TODO check timers, decide if they should be here (remove them on backend) or clear them here and use defaults on backend
    transport: custom(
      {
        request: viemRequest(evmNetwork.id),
      },
      {
        // backend will retry 3 times, no need to retry here
        retryCount: 0,
      }
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