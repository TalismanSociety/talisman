import { EthNetwork, EthNetworkId } from "@talismn/chaindata-provider"
import { camelCase, fromPairs, toPairs } from "lodash-es"
import { Chain, ChainContract } from "viem"
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
