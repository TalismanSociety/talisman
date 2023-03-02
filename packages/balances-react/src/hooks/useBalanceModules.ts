import { BalanceModule } from "@talismn/balances"

import { provideContext } from "../util/provideContext"

export type BalanceModulesProviderOptions = {
  // TODO: Make this array of BalanceModules more type-safe
  balanceModules: Array<BalanceModule<any, any, any, any, any>>
}

const useBalanceModulesProvider = ({ balanceModules }: BalanceModulesProviderOptions) =>
  balanceModules

export const [BalanceModulesProvider, useBalanceModules] = provideContext(useBalanceModulesProvider)
