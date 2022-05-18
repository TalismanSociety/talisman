import { useMemo } from "react"
import useChains from "./useChains"

const useSortedChains = () => {
  const chains = useChains()

  return useMemo(
    () => Object.values(chains).sort((a, b) => (a.sortIndex || 0) - (b.sortIndex || 0)),
    [chains]
  )
}

export default useSortedChains
