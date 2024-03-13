import { Chain } from "@extension/core"
import useChains from "@ui/hooks/useChains"
import { useMemo } from "react"

const sortChains = (a: Chain, b: Chain) =>
  (a.sortIndex || Number.MAX_SAFE_INTEGER) - (b.sortIndex || Number.MAX_SAFE_INTEGER)

export const useSortedChains = (includeTestnets: boolean) => {
  const { chains } = useChains({ activeOnly: true, includeTestnets })

  // chains array can't be mutated use concat to create a new array
  return useMemo(() => chains.concat().sort(sortChains), [chains])
}
