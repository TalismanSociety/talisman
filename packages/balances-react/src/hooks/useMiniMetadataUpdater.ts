import { MiniMetadataUpdater } from "@talismn/balances"
import { useMemo } from "react"

import { provideContext } from "../util/provideContext"
import { useBalanceModules } from "./useBalanceModules"
import { useChainConnectors } from "./useChainConnectors"
import { useChaindata } from "./useChaindata"

function useMiniMetadataUpdaterProvider() {
  const chainConnectors = useChainConnectors()
  const chaindataProvider = useChaindata()
  const balanceModules = useBalanceModules()

  const miniMetadataUpdater = useMemo(
    () =>
      chainConnectors.substrate &&
      chainConnectors.evm &&
      chaindataProvider &&
      balanceModules &&
      new MiniMetadataUpdater(chainConnectors, chaindataProvider, balanceModules),
    [chainConnectors, chaindataProvider, balanceModules]
  )

  return miniMetadataUpdater
}

export const [MiniMetadataUpdaterProvider, useMiniMetadataUpdater] = provideContext(
  useMiniMetadataUpdaterProvider
)
