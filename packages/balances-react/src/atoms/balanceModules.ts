import { AnyBalanceModule } from "@talismn/balances"
import { atom } from "jotai"

import { chainConnectorsAtom } from "./chainConnectors"
import { chaindataProviderAtom } from "./chaindataProvider"
import { balanceModuleCreatorsAtom } from "./config"

export const balanceModulesAtom = atom<Array<AnyBalanceModule>>((get) => {
  const balanceModuleCreators = get(balanceModuleCreatorsAtom)
  const chainConnectors = get(chainConnectorsAtom)
  const chaindataProvider = get(chaindataProviderAtom)

  if (!chainConnectors.substrate) return []
  if (!chainConnectors.evm) return []
  if (!chaindataProvider) return []

  return balanceModuleCreators.map((mod) => mod({ chainConnectors, chaindataProvider }))
})
