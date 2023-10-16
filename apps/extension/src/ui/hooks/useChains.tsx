import {
  allChainsMapState,
  allChainsState,
  chainsWithTestnetsMapState,
  chainsWithTestnetsState,
  chainsWithoutTestnetsMapState,
  chainsWithoutTestnetsState,
} from "@ui/atoms"
import { useMemo } from "react"
import { useRecoilValue } from "recoil"

type ChainsFilter = "all" | "enabledWithTestnets" | "enabledWithoutTestnets"

export const useChains = (filter: ChainsFilter) => {
  const allChains = useRecoilValue(allChainsState)
  const chainsWithTestnets = useRecoilValue(chainsWithTestnetsState)
  const chainsWithoutTestnets = useRecoilValue(chainsWithoutTestnetsState)
  const allChainsMap = useRecoilValue(allChainsMapState)
  const chainsWithTestnetsMap = useRecoilValue(chainsWithTestnetsMapState)
  const chainsWithoutTestnetsMap = useRecoilValue(chainsWithoutTestnetsMapState)

  return useMemo(() => {
    switch (filter) {
      case "all":
        return { chains: allChains, chainsMap: allChainsMap }
      case "enabledWithTestnets":
        return { chains: chainsWithTestnets, chainsMap: chainsWithTestnetsMap }
      case "enabledWithoutTestnets":
      default:
        return { chains: chainsWithoutTestnets, chainsMap: chainsWithoutTestnetsMap }
    }
  }, [
    allChains,
    allChainsMap,
    chainsWithTestnets,
    chainsWithTestnetsMap,
    chainsWithoutTestnets,
    chainsWithoutTestnetsMap,
    filter,
  ])
}

export default useChains
