import {
  ChainsQueryOptions,
  allChainsAtom,
  allChainsMapAtom,
  allChainsMapByGenesisHashAtom,
  chainsArrayAtomFamily,
  chainsMapAtomFamily,
} from "@ui/atoms"
import { atom, useAtomValue } from "jotai"
import { atomFamily } from "jotai/utils"
import isEqual from "lodash/isEqual"

export const useAllChains = () => useAtomValue(allChainsAtom)
export const useAllChainsMap = () => useAtomValue(allChainsMapAtom)
export const useAllChainsMapByGenesisHash = () => useAtomValue(allChainsMapByGenesisHashAtom)

const chainsAtomFamily = atomFamily(
  (filter: ChainsQueryOptions) =>
    atom(async (get) => {
      const [chains, chainsMap] = await Promise.all([
        get(chainsArrayAtomFamily(filter)),
        get(chainsMapAtomFamily(filter)),
      ])

      return { chains, chainsMap }
    }),
  isEqual
)

export const useChains = (filter: ChainsQueryOptions) => useAtomValue(chainsAtomFamily(filter))

export default useChains
