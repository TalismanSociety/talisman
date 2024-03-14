export * from "./useAllAddresses"
export * from "./useBalanceModules"
export * from "./useBalances"
export * from "./useBalancesHydrate"
export * from "./useBalancesStatus"
export * from "./useChainConnectors"
export * from "./useChaindata"
export * from "./useChains"
export * from "./useDbCache"
export * from "./useDbCacheSubscription"
export * from "./useEvmNetworks"
export * from "./useTokenRates"
export * from "./useTokens"
export * from "./useWithTestnets"

import { AnyBalanceModule, Hydrate } from "@talismn/balances"
import { ReactNode } from "react"

import { AllAddressesProvider } from "./useAllAddresses"
import { BalanceModulesProvider } from "./useBalanceModules"
import { ChainConnectorsProvider } from "./useChainConnectors"
import { ChaindataReactProvider } from "./useChaindata"
import { DbCacheProvider } from "./useDbCache"
import { EnabledChainsProvider } from "./useEnabledChains"
import { WithTestnetsProvider } from "./useWithTestnets"

export type BalancesProviderProps = {
  // TODO: Make this array of BalanceModules more type-safe
  balanceModules: Array<(hydrate: Hydrate) => AnyBalanceModule>
  onfinalityApiKey?: string
  withTestnets?: boolean
  /**
   * A list of chain genesisHashes to fetch balances for.
   *
   * If undefined, balances will be fetched for all chains.
   *
   * Only applies to built-in chains, custom chains will always fetch balances.
   *
   * NOTE: This is an allowlist to enable the dapp to disable balances for chains it does not care about.
   * Adding a chain here which is not already supported by the library will not automagically begin to fetch balances.
   * It will just be ignored.
   *
   * In a similar vein, if you add testnets here then make sure you've also set the `withTestnets` prop to `true`.
   *
   * @example
   * enabledChains={[
   *   // polkadot
   *   "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
   *   // kusama
   *   "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe",
   *   // rococo
   *   "0x6408de7737c59c238890533af25896a2c20608d8b380bb01029acb392781063e",
   *   // westend
   *   "0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e",
   * ]}
   */
  enabledChains?: string[]
  children?: ReactNode
}
export const BalancesProvider = ({
  balanceModules,
  onfinalityApiKey,
  withTestnets,
  enabledChains,
  children,
}: BalancesProviderProps) => (
  <WithTestnetsProvider withTestnets={withTestnets}>
    <EnabledChainsProvider enabledChains={enabledChains}>
      <ChaindataReactProvider onfinalityApiKey={onfinalityApiKey}>
        <ChainConnectorsProvider onfinalityApiKey={onfinalityApiKey}>
          <AllAddressesProvider>
            <BalanceModulesProvider balanceModules={balanceModules}>
              <DbCacheProvider>{children}</DbCacheProvider>
            </BalanceModulesProvider>
          </AllAddressesProvider>
        </ChainConnectorsProvider>
      </ChaindataReactProvider>
    </EnabledChainsProvider>
  </WithTestnetsProvider>
)
