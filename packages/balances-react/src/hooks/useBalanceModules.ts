import { BalanceModule, Hydrate } from "@talismn/balances"
import { useMemo } from "react"

import { provideContext } from "../util/provideContext"
import { useChainConnectors } from "./useChainConnectors"
import { useChaindata } from "./useChaindata"

export type BalanceModulesProviderOptions = {
  // TODO: Make this array of BalanceModules more type-safe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  balanceModules: Array<(hydrate: Hydrate) => BalanceModule<any, any, any, any, any>>
}

const useBalanceModulesProvider = ({ balanceModules }: BalanceModulesProviderOptions) => {
  const chainConnectors = useChainConnectors()
  const chaindataProvider = useChaindata()

  const hydrated = useMemo(
    () =>
      chainConnectors.substrate && chainConnectors.evm && chaindataProvider
        ? balanceModules.map((mod) => mod({ chainConnectors, chaindataProvider }))
        : [],
    [balanceModules, chainConnectors, chaindataProvider]
  )

  return hydrated
}

export const [BalanceModulesProvider, useBalanceModules] = provideContext(useBalanceModulesProvider)
