import { EthNetwork } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useNetworks } from "@ui/state"

const sortNetworks = (a: EthNetwork, b: EthNetwork) => (a.name || "").localeCompare(b.name || "")

export const useSortedEvmNetworks = (includeTestnets: boolean) => {
  const evmNetworks: EthNetwork[] = useNetworks({
    platform: "ethereum",
    activeOnly: true,
    includeTestnets,
  }) //as EthNetwork[] // TODO infer
  return useMemo(() => evmNetworks.concat().sort(sortNetworks), [evmNetworks])
}
