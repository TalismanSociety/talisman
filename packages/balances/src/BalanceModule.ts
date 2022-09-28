import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { ChainId, ChaindataProvider, IToken } from "@talismn/chaindata-provider"

import { AddressesByToken, Balances, SubscriptionCallback, UnsubscribeFn } from "./types"

//
// exported
//

export interface BalanceModule<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> extends BalanceModuleSubstrate<TModuleType, TTokenType, TChainMeta, TModuleConfig>,
    BalanceModuleEvm<TModuleType, TTokenType, TChainMeta, TModuleConfig> {}

// TODO: Document default balances module purpose/usage
export const DefaultBalanceModule = <
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
>(
  type: TModuleType
): BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig> => ({
  get type() {
    return type
  },

  async fetchSubstrateChainMeta() {
    return null
  },
  async fetchEvmChainMeta() {
    return null
  },

  async fetchSubstrateChainTokens() {
    return Promise.resolve({} as Record<TTokenType["id"], TTokenType>)
  },
  async fetchEvmChainTokens() {
    return Promise.resolve({} as Record<TTokenType["id"], TTokenType>)
  },

  async subscribeBalances(_chainConnectors, _chaindataProvider, _addressesByToken, callback) {
    callback(new Error("Balance subscriptions are not implemented in this module."))

    return () => {}
  },

  async fetchBalances() {
    throw new Error("Balance fetching is not implemented in this module.")
  },
})

//
// internal
//

export type ExtendableTokenType = IToken
export type ExtendableChainMeta = Record<string, unknown> | undefined
export type DefaultChainMeta = undefined
export type ExtendableModuleConfig = Record<string, unknown> | undefined
export type DefaultModuleConfig = undefined

interface BalanceModuleSubstrate<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> extends BalanceModuleCommon<TModuleType, TTokenType> {
  /** Pre-processes any substrate chain metadata required by this module ahead of time */
  fetchSubstrateChainMeta(
    chainConnector: ChainConnector,
    chaindataProvider: ChaindataProvider,
    chainId: ChainId
  ): Promise<TChainMeta | null>

  /** Detects which tokens are available on a given substrate chain */
  fetchSubstrateChainTokens(
    chainConnector: ChainConnector,
    chaindataProvider: ChaindataProvider,
    chainId: ChainId,
    chainMeta: TChainMeta,
    moduleConfig: TModuleConfig
  ): Promise<Record<TTokenType["id"], TTokenType>>
}

interface BalanceModuleEvm<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig
> extends BalanceModuleCommon<TModuleType, TTokenType> {
  /** Pre-processes any evm chain metadata required by this module ahead of time */
  fetchEvmChainMeta(
    chainConnector: ChainConnectorEvm,
    chaindataProvider: ChaindataProvider,
    chainId: ChainId
  ): Promise<TChainMeta | null>

  /** Detects which tokens are available on a given evm chain */
  fetchEvmChainTokens(
    chainConnector: ChainConnectorEvm,
    chaindataProvider: ChaindataProvider,
    chainId: ChainId,
    chainMeta: TChainMeta,
    moduleConfig: TModuleConfig
  ): Promise<Record<TTokenType["id"], TTokenType>>
}

interface BalanceModuleCommon<TModuleType extends string, TTokenType extends ExtendableTokenType> {
  get type(): TModuleType

  /**
   * Subscribe to balances for this module with optional filtering.
   *
   * If subscriptions are not possible, this function should poll at some reasonable interval.
   */
  subscribeBalances(
    chainConnectors: { substrate?: ChainConnector; evm?: ChainConnectorEvm },
    chaindataProvider: ChaindataProvider,
    addressesByToken: AddressesByToken<TTokenType>,
    // TODO: Provide a raw output separate to the `Balance` output
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn>

  /** Fetch balances for this module with optional filtering */
  fetchBalances(
    chainConnectors: { substrate?: ChainConnector; evm?: ChainConnectorEvm },
    chaindataProvider: ChaindataProvider,
    addressesByToken: AddressesByToken<TTokenType>
  ): Promise<Balances>

  // transferTx(): Promise<>

  // BalanceModule implementations must implement all of the methods required by this interface, but they may also implement additional methods for their own internal use.
  // This next line allows them to do this without getting a `Type is not assignable to type 'BalanceModule'` typescript error.
  [x: string | number | symbol]: unknown
}
