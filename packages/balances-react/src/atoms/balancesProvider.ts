import { BalancesProvider } from "@talismn/balances"
import { atom } from "jotai"

import { chainConnectorsAtom } from "./chainConnectors"
import { chaindataProviderAtom } from "./chaindataProvider"

export const balancesProviderAtom = atom<BalancesProvider>((get) => {
  return new BalancesProvider(
    get(chaindataProviderAtom),
    get(chainConnectorsAtom),
    // TODO pass storage
  )
})
