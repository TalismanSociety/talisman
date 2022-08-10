import { ChainConnector } from "@talismn/chain-connector"
import { ChainId, IToken } from "@talismn/chaindata-provider"

import { AddressesByToken, Balances, SubscriptionCallback, UnsubscribeFn } from "./types"

//
// exported
//

export interface BalanceModule<
  TTokenType extends ExtendableTokenType,
  TChainExtraMeta extends ExtendableChainExtraMeta = DefaultChainExtraMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> extends BalanceModuleSubstrate<TTokenType, TChainExtraMeta, TModuleConfig>,
    BalanceModuleEvm<TTokenType, TChainExtraMeta, TModuleConfig> {}

// TODO: Document default balances module purpose/usage
export const DefaultBalanceModule = <
  TTokenType extends ExtendableTokenType,
  TChainExtraMeta extends ExtendableChainExtraMeta = DefaultChainExtraMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(): BalanceModule<TTokenType, TChainExtraMeta, TModuleConfig> => ({
  async fetchSubstrateChainMeta() {
    return null
  },
  async fetchEvmChainMeta() {
    return null
  },

  async fetchSubstrateChainTokens(chainConnector, chainId) {
    return Promise.resolve({} as Record<TTokenType["id"], TTokenType>)
  },
  async fetchEvmChainTokens(chainConnector, chainId) {
    return Promise.resolve({} as Record<TTokenType["id"], TTokenType>)
  },

  async subscribeBalances(chainConnector, addressesByToken, callback) {
    callback(new Error("Balance subscriptions are not implemented in this module."))

    return () => {}
  },

  async fetchBalances(chainConnector, addressesByToken) {
    throw new Error("Balance fetching is not implemented in this module.")
  },
})

/**
 * Wraps a BalanceModule's fetch/subscribe methods with a single `balances` method.
 * This `balances` method will subscribe if a callback parameter is provided, or otherwise fetch.
 */
export async function balances<
  TTokenType extends ExtendableTokenType,
  TChainExtraMeta extends ExtendableChainExtraMeta = DefaultChainExtraMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(
  balanceModule: BalanceModule<TTokenType, TChainExtraMeta, TModuleConfig>,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<TTokenType>
): Promise<Balances>
export async function balances<
  TTokenType extends ExtendableTokenType,
  TChainExtraMeta extends ExtendableChainExtraMeta = DefaultChainExtraMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(
  balanceModule: BalanceModule<TTokenType, TChainExtraMeta, TModuleConfig>,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<TTokenType>,
  callback: SubscriptionCallback<Balances>
): Promise<UnsubscribeFn>
export async function balances<
  TTokenType extends ExtendableTokenType,
  TChainExtraMeta extends ExtendableChainExtraMeta = DefaultChainExtraMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(
  balanceModule: BalanceModule<TTokenType, TChainExtraMeta, TModuleConfig>,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<TTokenType>,
  callback?: SubscriptionCallback<Balances>
): Promise<Balances | UnsubscribeFn> {
  // subscription request
  if (callback !== undefined)
    return await balanceModule.subscribeBalances(chainConnector, addressesByToken, callback)

  // one-off request
  return await balanceModule.fetchBalances(chainConnector, addressesByToken)
}

//
// internal
//

type ExtendableTokenType = IToken // { id: TokenId }
type ExtendableChainExtraMeta = Record<string, unknown> | undefined
type DefaultChainExtraMeta = Record<string, never> | undefined
type ExtendableModuleConfig = Record<string, unknown> | undefined
type DefaultModuleConfig = Record<string, never> | undefined

interface BalanceModuleSubstrate<
  TTokenType extends ExtendableTokenType,
  TChainExtraMeta extends ExtendableChainExtraMeta = DefaultChainExtraMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> extends BalanceModuleCommon<TTokenType, TChainExtraMeta, TModuleConfig> {
  /** Pre-processes any substrate chain metadata required by this module ahead of time */
  fetchSubstrateChainMeta(
    chainConnector: ChainConnector,
    chainId: ChainId
  ): Promise<TChainExtraMeta | null>

  /** Detects which tokens are available on a given substrate chain */
  fetchSubstrateChainTokens(
    chainConnector: ChainConnector,
    chainId: ChainId
  ): Promise<Record<TTokenType["id"], TTokenType>>
}

interface BalanceModuleEvm<
  TTokenType extends ExtendableTokenType,
  TChainExtraMeta extends ExtendableChainExtraMeta = DefaultChainExtraMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> extends BalanceModuleCommon<TTokenType, TChainExtraMeta, TModuleConfig> {
  /** Pre-processes any evm chain metadata required by this module ahead of time */
  fetchEvmChainMeta(
    chainConnector: ChainConnector,
    chainId: ChainId
  ): Promise<TChainExtraMeta | null>

  /** Detects which tokens are available on a given evm chain */
  fetchEvmChainTokens(
    chainConnector: ChainConnector,
    chainId: ChainId
  ): Promise<Record<TTokenType["id"], TTokenType>>
}

interface BalanceModuleCommon<
  TTokenType extends ExtendableTokenType,
  TChainExtraMeta extends ExtendableChainExtraMeta = DefaultChainExtraMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> {
  // TODO: Provide a raw output separate to the `Balance` output
  subscribeBalances(
    chainConnector: ChainConnector,
    addressesByToken: AddressesByToken<TTokenType>,
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn>

  fetchBalances(
    chainConnector: ChainConnector,
    addressesByToken: AddressesByToken<TTokenType>
  ): Promise<Balances>

  // transferTx(): Promise<>
}
