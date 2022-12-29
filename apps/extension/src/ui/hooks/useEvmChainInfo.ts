import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

type EvmChainInfo = {
  chainId: number
  networkId: number
  name: string
  shortName: string
  title?: string
  chain: string
  infoURL: string
  faucets?: string[]
  rpc: string[]
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  explorers?: { name: string; standard: string; url: string; icon?: string }[]
  parent?: {
    type: "L1" | "L2"
    chain: "string"
  }
  icon?: string
  ens?: { registry: string }[]
  slip44?: number
}

// source https://github.com/ethereum-lists/chains/blob/gh-pages/chain.json
const useEvmChainsList = () => {
  return useQuery<EvmChainInfo[]>({
    queryKey: ["ethereum-lists/chains"],
    queryFn: async () => (await fetch("https://chainid.network/chains.json")).json(),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

export const useEvmChainInfo = (evmNetworkId?: string) => {
  const qEvmChainsList = useEvmChainsList()
  const chainInfo = useMemo(
    () => qEvmChainsList.data?.find((c) => String(c.chainId) === evmNetworkId),
    [evmNetworkId, qEvmChainsList.data]
  )

  return { chainInfo, ...qEvmChainsList }
}
