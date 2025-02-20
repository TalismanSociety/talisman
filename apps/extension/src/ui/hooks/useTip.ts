import { useCallback, useEffect, useMemo, useState } from "react"

import { ChainId } from "@extension/core"

export type TipOptionName = "low" | "medium" | "high"
export type TipOptions = Record<TipOptionName, string>
type TipOptionsResolver = (response: Response, chainId: ChainId) => Promise<TipOptions>

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
const gasStations: Record<ChainId, GasStationInfo> = {
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

const useTipStation = (chainId?: ChainId, autoRefresh = true) => {
  const [tipOptions, setTipOptions] = useState<TipOptions>()
  const [error, setError] = useState<string>()

  // reset if chain changes
  useEffect(() => {
    setTipOptions(undefined)
    setError(undefined)
  }, [chainId])

  const fetchTipOptions = useCallback(async () => {
    if (!chainId) return
    const gasStationInfo = gasStations[chainId]
    if (gasStationInfo) {
      try {
        const response = await fetch(gasStationInfo.url)
        const options = await gasStationInfo.resolver(response, chainId)
        setTipOptions(options)
      } catch (err) {
        setError("Failed to fetch tip options")
      }
    } else setTipOptions({ low: "0", medium: "0", high: "0" })
  }, [chainId])

  // auto refresh
  useEffect(() => {
    if (!autoRefresh) return () => {}

    const interval = setInterval(fetchTipOptions, 10_000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchTipOptions])

  // initial fetch
  useEffect(() => {
    fetchTipOptions()
  }, [fetchTipOptions])

  const requiresTip = useMemo(() => Boolean(chainId && gasStations[chainId]), [chainId])

  return { requiresTip, tipOptions, error }
}

export const useTip = (chainId?: string, autoRefresh = true, option: TipOptionName = "medium") => {
  const { requiresTip, tipOptions, error } = useTipStation(chainId, autoRefresh)

  const tip = useMemo(() => {
    if (!requiresTip) return "0"
    if (!tipOptions) return undefined
    return tipOptions[option]
  }, [option, requiresTip, tipOptions])

  return {
    requiresTip,
    tipOptions,
    tip,
    error,
  }
}
