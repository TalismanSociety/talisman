import { CustomEvmNetwork, EvmNetwork } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useEvmNetworks } from "@ui/state"

const sortNetworks = (a: EvmNetwork | CustomEvmNetwork, b: EvmNetwork | CustomEvmNetwork) =>
  (a.name || "").localeCompare(b.name || "")

export const useSortedEvmNetworks = (includeTestnets: boolean) => {
  const evmNetworks = useEvmNetworks({ activeOnly: true, includeTestnets })
  return useMemo(() => evmNetworks.concat().sort(sortNetworks), [evmNetworks])
}
