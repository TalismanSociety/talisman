import { EvmNetwork } from "@talismn/chaindata-provider"
import { Chain } from "viem"
import * as chains from "viem/chains"

import { addOnfinalityApiKey } from "./util"

// viem chains benefit from multicall config & other viem goodies
const VIEM_CHAINS = Object.keys(chains).reduce((acc, curr) => {
  const chain = chains[curr as keyof typeof chains]
  acc[chain.id] = chain
  return acc
}, {} as Record<number, Chain>)

const chainsCache = new Map<string, Chain>()

export const clearChainsCache = (evmNetworkId?: string) => {
  if (evmNetworkId) chainsCache.delete(evmNetworkId)
  else chainsCache.clear()
}

export type ChainOptions = {
  onFinalityApiKey?: string
}

export const getChainFromEvmNetwork = (
  evmNetwork: EvmNetwork,
  nativeToken: { symbol: string; decimals: number } | null,
  options: ChainOptions = {}
): Chain => {
  const { symbol, decimals } = nativeToken ?? { symbol: "ETH", decimals: 18 }

  if (!chainsCache.has(evmNetwork.id)) {
    const chainRpcs =
      evmNetwork.rpcs?.map((rpc) => addOnfinalityApiKey(rpc.url, options.onFinalityApiKey)) ?? []

    const viemChain = VIEM_CHAINS[Number(evmNetwork.id)] ?? {}

    const chain: Chain = {
      ...viemChain,
      id: Number(evmNetwork.id),
      name: evmNetwork.name ?? `EVM Chain ${evmNetwork.id}`,
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

    chainsCache.set(evmNetwork.id, chain)
  }

  return chainsCache.get(evmNetwork.id) as Chain
}
