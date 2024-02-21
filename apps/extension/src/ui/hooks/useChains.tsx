import { ChainsQueryOptions, chainsArrayAtomFamily, chainsMapAtomFamily } from "@ui/atoms"
import { atom, useAtomValue } from "jotai"
import { atomFamily } from "jotai/utils"

const chainsAtomFamily = atomFamily((filter: ChainsQueryOptions) =>
  atom(async (get) => {
    const [chains, chainsMap] = await Promise.all([
      get(chainsArrayAtomFamily(filter)),
      get(chainsMapAtomFamily(filter)),
    ])

    return { chains, chainsMap }
  })
)

export const useChains = (filter: ChainsQueryOptions) => useAtomValue(chainsAtomFamily(filter))

export default useChains
