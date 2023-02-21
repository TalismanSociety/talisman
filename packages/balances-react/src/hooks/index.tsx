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

import { BalanceModule } from "@talismn/balances"
import { ReactNode } from "react"

import { AllAddressesProvider } from "./useAllAddresses"
import { BalanceModulesProvider } from "./useBalanceModules"
import { ChainConnectorsProvider } from "./useChainConnectors"
import { ChaindataProvider } from "./useChaindata"
import { DbCacheProvider } from "./useDbCache"
import { SubscriptionsProvider } from "./useDbCacheSubscription"

export type BalancesProviderProps = {
  // TODO: Make this array of BalanceModules more type-safe
  balanceModules: Array<BalanceModule<any, any, any, any, any>>
  onfinalityApiKey?: string
  useTestnets?: boolean
  children?: ReactNode
}
export const BalancesProvider = ({
  balanceModules,
  onfinalityApiKey,
  useTestnets,
  children,
}: BalancesProviderProps) => (
  <ChaindataProvider onfinalityApiKey={onfinalityApiKey}>
    <ChainConnectorsProvider onfinalityApiKey={onfinalityApiKey}>
      <AllAddressesProvider>
        <BalanceModulesProvider balanceModules={balanceModules}>
          <DbCacheProvider useTestnets={useTestnets}>
            <SubscriptionsProvider>{children}</SubscriptionsProvider>
          </DbCacheProvider>
        </BalanceModulesProvider>
      </AllAddressesProvider>
    </ChainConnectorsProvider>
  </ChaindataProvider>
)
