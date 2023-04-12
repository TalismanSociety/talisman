import {
  chainsWithTestnetsMapState,
  chainsWithTestnetsState,
  chainsWithoutTestnetsMapState,
  chainsWithoutTestnetsState,
} from "@ui/atoms"
import { useMemo } from "react"
import { useRecoilValue } from "recoil"

export const useChains = (withTestnets: boolean) => {
  // // keep db data ption("chains")

  const chainsWithTestnets = useRecoilValue(chainsWithTestnetsState)
  const chainsWithoutTestnets = useRecoilValue(chainsWithoutTestnetsState)
  const chainsWithTestnetsMap = useRecoilValue(chainsWithTestnetsMapState)
  const chainsWithoutTestnetsMap = useRecoilValue(chainsWithoutTestnetsMapState)

  return useMemo(
    () => ({
      chains: withTestnets ? chainsWithTestnets : chainsWithoutTestnets,
      chainsMap: withTestnets ? chainsWithTestnetsMap : chainsWithoutTestnetsMap,
    }),
    [
      chainsWithTestnets,
      chainsWithTestnetsMap,
      chainsWithoutTestnets,
      chainsWithoutTestnetsMap,
      withTestnets,
    ]
  )
}

export default useChains
