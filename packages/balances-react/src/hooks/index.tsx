export * from "./useAllAddresses"
export * from "./useBalanceModules"
export * from "./useBalances"
export * from "./useBalancesHydrate"
export * from "./useChainConnectors"
export * from "./useChaindata"
export * from "./useChains"
export * from "./useDbCache"
export * from "./useDbCacheSubscription"
export * from "./useEvmNetworks"
export * from "./useTokenRates"
export * from "./useTokens"
export * from "./useWithTestnets"

import { BalanceModule } from "@talismn/balances"
import { ReactNode } from "react"

import { AllAddressesProvider } from "./useAllAddresses"
import { BalanceModulesProvider } from "./useBalanceModules"
import { ChainConnectorsProvider } from "./useChainConnectors"
import { ChaindataProvider } from "./useChaindata"
import { DbCacheProvider } from "./useDbCache"
import { WithTestnetsProvider } from "./useWithTestnets"

export type BalancesProviderProps = {
  // TODO: Make this array of BalanceModules more type-safe
  balanceModules: Array<BalanceModule<any, any, any, any, any>>
  onfinalityApiKey?: string
  withTestnets?: boolean
  children?: ReactNode
}
export const BalancesProvider = ({
  balanceModules,
  onfinalityApiKey,
  withTestnets,
  children,
}: BalancesProviderProps) => (
  <WithTestnetsProvider withTestnets={withTestnets}>
    <ChaindataProvider onfinalityApiKey={onfinalityApiKey}>
      <ChainConnectorsProvider onfinalityApiKey={onfinalityApiKey}>
        <AllAddressesProvider>
          <BalanceModulesProvider balanceModules={balanceModules}>
            <DbCacheProvider>{children}</DbCacheProvider>
          </BalanceModulesProvider>
        </AllAddressesProvider>
      </ChainConnectorsProvider>
    </ChaindataProvider>
  </WithTestnetsProvider>
)
