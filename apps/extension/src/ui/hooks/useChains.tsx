import { ChainsQueryOptions, chainsArrayQuery, chainsMapQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useChains = (filter: ChainsQueryOptions) => {
  const chains = useRecoilValue(chainsArrayQuery(filter))
  const chainsMap = useRecoilValue(chainsMapQuery(filter))

  return { chains, chainsMap }
}

export default useChains
