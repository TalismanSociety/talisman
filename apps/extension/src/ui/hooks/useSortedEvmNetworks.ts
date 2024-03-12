import { CustomEvmNetwork, EvmNetwork } from "@talismn/chaindata-provider"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useMemo } from "react"

const sortNetworks = (a: EvmNetwork | CustomEvmNetwork, b: EvmNetwork | CustomEvmNetwork) =>
  (a.name || "").localeCompare(b.name || "")

export const useSortedEvmNetworks = (includeTestnets: boolean) => {
  const { evmNetworks } = useEvmNetworks({ activeOnly: true, includeTestnets })
  return useMemo(() => evmNetworks.concat().sort(sortNetworks), [evmNetworks])
}
