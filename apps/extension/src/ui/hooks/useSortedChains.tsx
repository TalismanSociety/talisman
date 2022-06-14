import { Chain } from "@core/types"
import { useMemo } from "react"
import useChains from "@ui/hooks/useChains"

const sortChains = (a: Chain, b: Chain) =>
  (a.sortIndex || Number.MAX_SAFE_INTEGER) - (b.sortIndex || Number.MAX_SAFE_INTEGER)

export const useSortedChains = () => {
  const chains = useChains()
  return useMemo(() => (chains || []).sort(sortChains), [chains])
}
