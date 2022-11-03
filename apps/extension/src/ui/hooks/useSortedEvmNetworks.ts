import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useMemo } from "react"

const sortNetworks = (a: EvmNetwork | CustomEvmNetwork, b: EvmNetwork | CustomEvmNetwork) =>
  (a.name || "").localeCompare(b.name || "")

export const useSortedEvmNetworks = () => {
  const networks = useEvmNetworks()
  return useMemo(() => networks.sort(sortNetworks), [networks])
}
