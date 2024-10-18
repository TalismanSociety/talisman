import { bind } from "@react-rxjs/core"
import { combineLatest, map } from "rxjs"

import { ChaindataQueryOptions, getChains$, getChainsMap$ } from "@ui/state"

export { useAllChains, useAllChainsMap, useAllChainsMapByGenesisHash } from "@ui/state"

// TODO put in state
export const [useChains] = bind((filter: ChaindataQueryOptions) =>
  combineLatest([getChains$(filter), getChainsMap$(filter)]).pipe(
    map(([chains, chainsMap]) => ({ chains, chainsMap }))
  )
)
