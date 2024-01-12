import { AnyBalanceModule, Hydrate } from "@talismn/balances"
import { watCryptoWaitReady } from "@talismn/scale"
import { useEffect, useMemo, useState } from "react"

import { provideContext } from "../util/provideContext"
import { useChainConnectors } from "./useChainConnectors"
import { useChaindata } from "./useChaindata"

export type BalanceModulesProviderOptions = {
  // TODO: Make this array of BalanceModules more type-safe
  balanceModules: Array<(hydrate: Hydrate) => AnyBalanceModule>
}

const useBalanceModulesProvider = ({ balanceModules }: BalanceModulesProviderOptions) => {
  const chainConnectors = useChainConnectors()
  const chaindataProvider = useChaindata()

  const [cryptoReady, setCryptoReady] = useState(false)
  useEffect(() => {
    watCryptoWaitReady().then(() => setCryptoReady(true))
  }, [])

  const hydrated = useMemo(
    () =>
      chainConnectors.substrate && chainConnectors.evm && chaindataProvider && cryptoReady
        ? balanceModules.map((mod) => mod({ chainConnectors, chaindataProvider }))
        : [],
    [balanceModules, chainConnectors, chaindataProvider, cryptoReady]
  )

  return hydrated
}

export const [BalanceModulesProvider, useBalanceModules] = provideContext(useBalanceModulesProvider)
