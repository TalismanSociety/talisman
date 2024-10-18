import { bind } from "@react-rxjs/core"
import { combineLatest, map } from "rxjs"

import { ChaindataQueryOptions, getEvmNetworks$, getEvmNetworksMap$ } from "@ui/state"

export { useAllEvmNetworks, useAllEvmNetworksMap } from "@ui/state"

// use only for networks list that is used to enable/disable networks
//export const useAllEvmNetworks = () => useAtomValue(allEvmNetworksAtom)
//export const useAllEvmNetworksMap = () => useAtomValue(allEvmNetworksMapAtom)

// const evmNetworksAtomFamily = atomFamily(
//   (filter: EvmNetworksQueryOptions) =>
//     atom(async (get) => {
//       const [evmNetworks, evmNetworksMap] = await Promise.all([
//         get(evmNetworksArrayAtomFamily(filter)),
//         get(evmNetworksMapAtomFamily(filter)),
//       ])
//       return { evmNetworks, evmNetworksMap }
//     }),
//   isEqual
// )

// TODO put in state
export const [useEvmNetworks] = bind((filter: ChaindataQueryOptions) =>
  combineLatest([getEvmNetworks$(filter), getEvmNetworksMap$(filter)]).pipe(
    map(([evmNetworks, evmNetworksMap]) => ({ evmNetworks, evmNetworksMap }))
  )
)
