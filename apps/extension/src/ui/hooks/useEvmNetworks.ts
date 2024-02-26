import {
  EvmNetworksQueryOptions,
  allEvmNetworksAtom,
  allEvmNetworksMapAtom,
  evmNetworksArrayAtomFamily,
  evmNetworksMapAtomFamily,
} from "@ui/atoms"
import { atom, useAtomValue } from "jotai"
import { atomFamily } from "jotai/utils"
import isEqual from "lodash/isEqual"

// use only for networks list that is used to enable/disable networks
export const useAllEvmNetworks = () => useAtomValue(allEvmNetworksAtom)
export const useAllEvmNetworksMap = () => useAtomValue(allEvmNetworksMapAtom)

const evmNetworksAtomFamily = atomFamily(
  (filter: EvmNetworksQueryOptions) =>
    atom(async (get) => {
      const [evmNetworks, evmNetworksMap] = await Promise.all([
        get(evmNetworksArrayAtomFamily(filter)),
        get(evmNetworksMapAtomFamily(filter)),
      ])
      return { evmNetworks, evmNetworksMap }
    }),
  isEqual
)

export const useEvmNetworks = (filter: EvmNetworksQueryOptions) =>
  useAtomValue(evmNetworksAtomFamily(filter))
