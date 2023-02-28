import { UnsignedTransaction } from "@substrate/txwrapper-core"
import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { ChainId, ChaindataProvider, IToken } from "@talismn/chaindata-provider"
import { ethers } from "ethers"

import { AddressesByToken, Balances, SubscriptionCallback, UnsubscribeFn } from "./types"

//
// exported
//

export type ExtendableTokenType = IToken
export type ExtendableChainMeta = Record<string, unknown> | undefined
export type DefaultChainMeta = undefined
export type ExtendableModuleConfig = Record<string, unknown> | undefined
export type DefaultModuleConfig = undefined
export type BaseTransferParams = { tokenId: string; from: string; to: string; amount: string }
export type ExtendableTransferParams = BaseTransferParams | undefined
export type DefaultTransferParams = undefined

export type NewTransferParamsType<T extends Record<string, unknown>> = BaseTransferParams & T

export type TransferTokenTx =
  | { type: "substrate"; tx: UnsignedTransaction }
  | { type: "evm"; tx: ethers.providers.TransactionRequest }

export interface BalanceModule<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
> extends BalanceModuleSubstrate<
      TModuleType,
      TTokenType,
      TChainMeta,
      TModuleConfig,
      TTransferParams
    >,
    BalanceModuleEvm<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams> {}

// TODO: Document default balances module purpose/usage
export const DefaultBalanceModule = <
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
>(
  type: TModuleType
): BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams> => ({
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

  async transferToken() {
    throw new Error("Token transfers are not implemented in this module.")
  },
})

//
// internal
//

interface BalanceModuleSubstrate<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
> extends BalanceModuleCommon<TModuleType, TTokenType, TTransferParams> {
  /** Pre-processes any substrate chain metadata required by this module ahead of time */
  fetchSubstrateChainMeta(
    chainConnector: ChainConnector,
    chaindataProvider: ChaindataProvider,
    chainId: ChainId,
    moduleConfig: TModuleConfig | undefined
  ): Promise<TChainMeta | null>

  /** Detects which tokens are available on a given substrate chain */
  fetchSubstrateChainTokens(
    chainConnector: ChainConnector,
    chaindataProvider: ChaindataProvider,
    chainId: ChainId,
    chainMeta: TChainMeta,
    moduleConfig: TModuleConfig | undefined
  ): Promise<Record<TTokenType["id"], TTokenType>>
}

interface BalanceModuleEvm<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
> extends BalanceModuleCommon<TModuleType, TTokenType, TTransferParams> {
  /** Pre-processes any evm chain metadata required by this module ahead of time */
  fetchEvmChainMeta(
    chainConnector: ChainConnectorEvm,
    chaindataProvider: ChaindataProvider,
    chainId: ChainId,
    moduleConfig: TModuleConfig | undefined
  ): Promise<TChainMeta | null>

  /** Detects which tokens are available on a given evm chain */
  fetchEvmChainTokens(
    chainConnector: ChainConnectorEvm,
    chaindataProvider: ChaindataProvider,
    chainId: ChainId,
    chainMeta: TChainMeta,
    moduleConfig: TModuleConfig | undefined
  ): Promise<Record<TTokenType["id"], TTokenType>>
}

interface BalanceModuleCommon<
  TModuleType extends string,
  TTokenType extends ExtendableTokenType,
  TTransferParams extends ExtendableTransferParams
> {
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

  transferToken(
    chainConnectors: { substrate?: ChainConnector; evm?: ChainConnectorEvm },
    chaindataProvider: ChaindataProvider,
    transferParams: TTransferParams
  ): Promise<TransferTokenTx | null>

  // BalanceModule implementations must implement all of the methods required by this interface, but they may also implement additional methods for their own internal use.
  // This next line allows them to do this without getting a `Type is not assignable to type 'BalanceModule'` typescript error.
  [x: string | number | symbol]: unknown
}
