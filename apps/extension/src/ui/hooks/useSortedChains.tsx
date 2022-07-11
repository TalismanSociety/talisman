import { Chain } from "@core/domains/chains/types"
import useChains from "@ui/hooks/useChains"
import { useMemo } from "react"

const sortChains = (a: Chain, b: Chain) =>
  (a.sortIndex || Number.MAX_SAFE_INTEGER) - (b.sortIndex || Number.MAX_SAFE_INTEGER)

export const useSortedChains = () => {
  const chains = useChains()
  return useMemo(() => (chains || []).sort(sortChains), [chains])
}
