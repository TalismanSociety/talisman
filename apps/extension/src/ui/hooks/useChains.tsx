import { ChainsQueryOptions, chainsArrayQuery, chainsMapQuery } from "@ui/atoms"
import { useRecoilValue, waitForAll } from "recoil"

export const useChains = (filter: ChainsQueryOptions) => {
  const [chains, chainsMap] = useRecoilValue(
    waitForAll([chainsArrayQuery(filter), chainsMapQuery(filter)])
  )

  return { chains, chainsMap }
}

export default useChains
