import { useQuery } from "@tanstack/react-query"

type EvmChainInfo = {
  chainId: number
  networkId: number
  name: string
  shortName: string
  title?: string
  chain: string // token symbol for the chain ?
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

export const useEvmChainsList = () => {
  return useQuery<EvmChainInfo[]>({
    queryKey: ["https://chainid.network/chains.json"],
    queryFn: async () => (await fetch("https://chainid.network/chains.json")).json(),
  })
}
