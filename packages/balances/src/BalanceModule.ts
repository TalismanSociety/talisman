import { ChainConnector } from "@talismn/chain-connector"
import { ChainId, IToken } from "@talismn/chaindata-provider"

import { AddressesByToken, Balances, SubscriptionCallback, UnsubscribeFn } from "./types"

//
// exported
//

export interface BalanceModule<
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> extends BalanceModuleSubstrate<TTokenType, TChainMeta, TModuleConfig>,
    BalanceModuleEvm<TTokenType, TChainMeta, TModuleConfig> {}

// TODO: Document default balances module purpose/usage
export const DefaultBalanceModule = <
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(): BalanceModule<TTokenType, TChainMeta, TModuleConfig> => ({
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
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(
  balanceModule: BalanceModule<TTokenType, TChainMeta, TModuleConfig>,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<TTokenType>
): Promise<Balances>
export async function balances<
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(
  balanceModule: BalanceModule<TTokenType, TChainMeta, TModuleConfig>,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<TTokenType>,
  callback: SubscriptionCallback<Balances>
): Promise<UnsubscribeFn>
export async function balances<
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(
  balanceModule: BalanceModule<TTokenType, TChainMeta, TModuleConfig>,
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

type ExtendableTokenType = IToken
type ExtendableChainMeta = Record<string, unknown> | undefined
type DefaultChainMeta = Record<string, never> | undefined
type ExtendableModuleConfig = Record<string, unknown> | undefined
type DefaultModuleConfig = Record<string, never> | undefined

interface BalanceModuleSubstrate<
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> extends BalanceModuleCommon<TTokenType, TChainMeta, TModuleConfig> {
  /** Pre-processes any substrate chain metadata required by this module ahead of time */
  fetchSubstrateChainMeta(
    chainConnector: ChainConnector,
    chainId: ChainId
  ): Promise<TChainMeta | null>

  /** Detects which tokens are available on a given substrate chain */
  fetchSubstrateChainTokens(
    chainConnector: ChainConnector,
    chainId: ChainId
  ): Promise<Record<TTokenType["id"], TTokenType>>
}

interface BalanceModuleEvm<
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> extends BalanceModuleCommon<TTokenType, TChainMeta, TModuleConfig> {
  /** Pre-processes any evm chain metadata required by this module ahead of time */
  fetchEvmChainMeta(chainConnector: ChainConnector, chainId: ChainId): Promise<TChainMeta | null>

  /** Detects which tokens are available on a given evm chain */
  fetchEvmChainTokens(
    chainConnector: ChainConnector,
    chainId: ChainId
  ): Promise<Record<TTokenType["id"], TTokenType>>
}

interface BalanceModuleCommon<
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> {
  /**
   * Subscribe to balances for this module with optional filtering.
   *
   * If subscriptions are not possible, this function should poll at some reasonable interval.
   */
  subscribeBalances(
    chainConnector: ChainConnector,
    addressesByToken: AddressesByToken<TTokenType>,
    // TODO: Provide a raw output separate to the `Balance` output
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn>

  /** Fetch balances for this module with optional filtering */
  fetchBalances(
    chainConnector: ChainConnector,
    addressesByToken: AddressesByToken<TTokenType>
  ): Promise<Balances>

  // transferTx(): Promise<>

  // BalanceModule implementations must implement all of the methods required by this interface, but they may also implement additional methods for their own internal use.
  // This next line allows them to do this without getting a `Type is not assignable to type 'BalanceModule'` typescript error.
  [x: string | number | symbol]: unknown
}
