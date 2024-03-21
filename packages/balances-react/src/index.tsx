export * from "./hooks/useBalances"
export * from "./hooks/useChainConnectors"
export * from "./hooks/useChaindata"
export * from "./hooks/useTokenRates"

export * from "./atoms/allAddresses"
export * from "./atoms/balanceModules"
export * from "./atoms/balances"
export * from "./atoms/chainConnectors"
export * from "./atoms/chaindata"
export * from "./atoms/chaindataProvider"
export * from "./atoms/config"
export * from "./atoms/cryptoWaitReady"
export * from "./atoms/tokenRates"

import { AnyBalanceModule, Hydrate } from "@talismn/balances"
import { useSetAtom } from "jotai"
import { ReactNode, useEffect } from "react"

import {
  balanceModuleCreatorsAtom,
  coingeckoConfigAtom,
  enableTestnetsAtom,
  enabledChainsAtom,
  enabledTokensAtom,
  onfinalityApiKeyAtom,
} from "./atoms/config"

export type BalancesConfig = {
  /**
   * Optionally provide your own array of BalanceModules, when you don't want to use the defaults.
   */
  balanceModules?: Array<(hydrate: Hydrate) => AnyBalanceModule>

  /**
   * This key will be used in place of any public onfinality RPCs
   */
  onfinalityApiKey?: string

  coingeckoApiUrl?: string
  coingeckoApiKeyName?: string
  coingeckoApiKeyValue?: string

  /** Enables balances fetching for tokens on testnet chains. */
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
   * In a similar vein, if you add testnets here then make sure you've also set the `useTestnets` prop to `true`.
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

  /**
   * A list of token ids to fetch balances for.
   *
   * If undefined, balances will be fetched for all tokens.
   *
   * If `enabledChains` is also defined, both filters will be applied,
   * such that only the intersection of enabledChains and enabledTokens will be fetched.
   *
   * @example
   * enabledTokens={[
   *   // DOT (polkadot relay chain)
   *   "polkadot-substrate-native",
   *   // USDC (polkadot asset hub)
   *   "polkadot-asset-hub-substrate-assets-1337-usdc",
   *   // ETH (ethereum mainnet)
   *   "1-evm-native",
   *   // GM (gm chain)
   *   "gm-substrate-tokens-gm",
   * ]}
   */
  enabledTokens?: string[]

  children?: ReactNode
}

export const BalancesProvider = ({
  balanceModules,
  onfinalityApiKey,

  coingeckoApiUrl,
  coingeckoApiKeyName,
  coingeckoApiKeyValue,

  withTestnets,
  enabledChains,
  enabledTokens,

  children,
}: BalancesConfig) => {
  const setBalanceModules = useSetAtom(balanceModuleCreatorsAtom)
  useEffect(() => {
    if (balanceModules !== undefined) setBalanceModules(balanceModules)
  }, [balanceModules, setBalanceModules])

  const setOnfinalityApiKey = useSetAtom(onfinalityApiKeyAtom)
  useEffect(() => {
    setOnfinalityApiKey(onfinalityApiKey)
  }, [onfinalityApiKey, setOnfinalityApiKey])

  const setCoingeckoConfig = useSetAtom(coingeckoConfigAtom)
  useEffect(() => {
    setCoingeckoConfig({
      apiUrl: coingeckoApiUrl,
      apiKeyName: coingeckoApiKeyName,
      apiKeyValue: coingeckoApiKeyValue,
    })
  }, [coingeckoApiKeyName, coingeckoApiKeyValue, coingeckoApiUrl, setCoingeckoConfig])

  const setEnableTestnets = useSetAtom(enableTestnetsAtom)
  useEffect(() => {
    setEnableTestnets(withTestnets ?? false)
  }, [setEnableTestnets, withTestnets])

  const setEnabledChains = useSetAtom(enabledChainsAtom)
  useEffect(() => {
    setEnabledChains(enabledChains)
  }, [enabledChains, setEnabledChains])

  const setEnabledTokens = useSetAtom(enabledTokensAtom)
  useEffect(() => {
    setEnabledTokens(enabledTokens)
  }, [enabledTokens, setEnabledTokens])

  return <>{children}</>
}
