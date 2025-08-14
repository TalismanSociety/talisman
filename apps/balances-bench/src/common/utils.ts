import { EthNetwork, EthNetworkId } from "@talismn/chaindata-provider"
import { camelCase, fromPairs, toPairs } from "lodash-es"
import { Chain, ChainContract, createPublicClient, fallback, http, PublicClient } from "viem"
import * as viemChains from "viem/chains"

// exclude zoraTestnet which uses Hyperliquid's chain id
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { zoraTestnet, ...validViemChains } = viemChains

// viem chains benefit from multicall config & other viem goodies
const VIEM_CHAINS = Object.keys(validViemChains).reduce(
  (acc, curr) => {
    const chain = validViemChains[curr as keyof typeof validViemChains]
    acc[chain.id] = chain
    return acc
  },
  {} as Record<number, Chain>,
)

const chainsCache = new Map<string, Chain>()

export const clearChainsCache = (networkId?: EthNetworkId) => {
  if (networkId) chainsCache.delete(networkId)
  else chainsCache.clear()
}

export const getChainFromEvmNetwork = (network: EthNetwork): Chain => {
  const { symbol, decimals } = network.nativeCurrency

  if (!chainsCache.has(network.id)) {
    const chainRpcs = network.rpcs ?? []

    const viemChain = VIEM_CHAINS[Number(network.id)] ?? {}

    const chain: Chain = {
      ...viemChain,
      id: Number(network.id),
      name: network.name ?? `Ethereum Chain ${network.id}`,
      rpcUrls: {
        public: { http: chainRpcs },
        default: { http: chainRpcs },
      },
      nativeCurrency: {
        symbol,
        decimals,
        name: symbol,
      },
      contracts: {
        ...viemChain.contracts,
        ...(network.contracts
          ? fromPairs(
              toPairs(network.contracts).map(([name, address]): [string, ChainContract] => [
                camelCase(name),
                { address },
              ]),
            )
          : {}),
      },
    }

    chainsCache.set(network.id, chain)
  }

  return chainsCache.get(network.id) as Chain
}

export type TransportOptions = {
  batch?:
    | boolean
    | {
        batchSize?: number | undefined
        wait?: number | undefined
      }
}

export const getTransportForEvmNetwork = (
  evmNetwork: EthNetwork,
  options: TransportOptions = {},
) => {
  if (!evmNetwork.rpcs?.length) throw new Error("No RPCs found for EVM network")

  const { batch } = options

  return fallback(
    evmNetwork.rpcs.map((url) => http(url, { batch, retryCount: 0 })),
    { retryCount: 0 },
  )
}

const MUTLICALL_BATCH_WAIT = 25
const MUTLICALL_BATCH_SIZE = 100

const HTTP_BATCH_WAIT = 25
const HTTP_BATCH_SIZE_WITH_MULTICALL = 10
const HTTP_BATCH_SIZE_WITHOUT_MULTICALL = 30

// cache to reuse previously created public clients
const publicClientCache = new Map<string, PublicClient>()

export const clearPublicClientCache = (evmNetworkId?: string) => {
  clearChainsCache(evmNetworkId)

  if (evmNetworkId) publicClientCache.delete(evmNetworkId)
  else publicClientCache.clear()
}

export const getEvmNetworkPublicClient = (network: EthNetwork): PublicClient => {
  const chain = getChainFromEvmNetwork(network)

  if (!publicClientCache.has(network.id)) {
    if (!network.rpcs.length) throw new Error("No RPCs found for Ethereum network")

    const batch = chain.contracts?.multicall3
      ? { multicall: { wait: MUTLICALL_BATCH_WAIT, batchSize: MUTLICALL_BATCH_SIZE } }
      : undefined

    const transportOptions = {
      batch: {
        batchSize: chain.contracts?.multicall3
          ? HTTP_BATCH_SIZE_WITH_MULTICALL
          : HTTP_BATCH_SIZE_WITHOUT_MULTICALL,
        wait: HTTP_BATCH_WAIT,
      },
    }

    const transport = getTransportForEvmNetwork(network, transportOptions)

    publicClientCache.set(
      network.id,
      createPublicClient({
        chain,
        transport,
        batch,
      }),
    )
  }

  return publicClientCache.get(network.id) as PublicClient
}
