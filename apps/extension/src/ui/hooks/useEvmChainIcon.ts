import { useQuery } from "@tanstack/react-query"
import { getSafeImageUrl } from "@ui/util/getSafeImageUrl"
import { useMemo } from "react"

type EvmChainIconInfo = {
  name: string
  icons: {
    url: string
    width: number
    height: number
  }[]
}

// source https://github.com/ethereum-lists/chains/blob/gh-pages/chain_icons.json
const useEvmChainIconsList = () => {
  return useQuery<EvmChainIconInfo[]>({
    queryKey: ["ethereum-lists/chain_icons"],
    queryFn: async () => (await fetch("https://chainid.network/chain_icons_mini.json")).json(),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

export const useEvmChainIcon = (chainIconId?: string) => {
  const qIcons = useEvmChainIconsList()

  const url = useMemo(() => {
    const ipfsUrl = qIcons.data?.find((i) => i.name === chainIconId)?.icons[0]?.url
    return ipfsUrl ? getSafeImageUrl(ipfsUrl, 256, 256) : undefined
  }, [chainIconId, qIcons.data])

  return { url, ...qIcons }
}
