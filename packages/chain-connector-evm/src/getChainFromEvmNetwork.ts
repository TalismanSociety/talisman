import { EthNetwork, EthNetworkId } from "@talismn/chaindata-provider"
import { Chain } from "viem"
import * as chains from "viem/chains"

// viem chains benefit from multicall config & other viem goodies
const VIEM_CHAINS = Object.keys(chains).reduce(
  (acc, curr) => {
    const chain = chains[curr as keyof typeof chains]
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
      name: network.name ?? `EVM Chain ${network.id}`,
      rpcUrls: {
        public: { http: chainRpcs },
        default: { http: chainRpcs },
      },
      nativeCurrency: {
        symbol,
        decimals,
        name: symbol,
      },
    }

    chainsCache.set(network.id, chain)
  }

  return chainsCache.get(network.id) as Chain
}
