import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

export type TipOptionName = "low" | "medium" | "high"
export type TipOptions = Record<TipOptionName, string>
type TipOptionsResolver = (response: Response, chainId: DotNetworkId) => Promise<TipOptions>

type GasStationInfo = {
  url: string
  resolver: TipOptionsResolver
}

const getAstarTipOptions: TipOptionsResolver = async (response) => {
  const json = await response.json()

  return {
    low: json.data.tip.slow,
    medium: json.data.tip.average,
    high: json.data.tip.fast,
  }
}

// each gas station has a different response shape
const gasStations: Record<DotNetworkId, GasStationInfo> = {
  astar: {
    url: "https://gas.astar.network/api/gasnow?network=astar",
    resolver: getAstarTipOptions,
  },
  shiden: {
    url: "https://gas.astar.network/api/gasnow?network=shiden",
    resolver: getAstarTipOptions,
  },
  shibuya: {
    url: "https://gas.astar.network/api/gasnow?network=shibuya",
    resolver: getAstarTipOptions,
  },
}

const fetchTipOptions = async (networkId: DotNetworkId) => {
  try {
    const gasStationInfo = gasStations[networkId]
    if (!gasStationInfo) return null

    const response = await fetch(gasStationInfo.url)
    return await gasStationInfo.resolver(response, networkId)
  } catch (cause) {
    throw new Error(`Failed to fetch tip options for ${networkId}`, { cause })
  }
}

export const useTip = (chainId?: string, autoRefresh = true, option: TipOptionName = "medium") => {
  return useQuery({
    queryKey: ["useTip", chainId],
    queryFn: () => {
      if (!chainId) return null
      return fetchTipOptions(chainId as DotNetworkId)
    },
    enabled: Boolean(chainId),
    refetchInterval: autoRefresh ? 10_000 : false,
    select: (data) => {
      return data?.[option] || "0"
    },
  })
}
