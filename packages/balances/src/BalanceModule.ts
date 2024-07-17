import { UnsignedTransaction } from "@substrate/txwrapper-core"
import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { ChaindataProvider, ChainId, Token } from "@talismn/chaindata-provider"

import {
  AddressesByToken,
  BalanceJson,
  Balances,
  SubscriptionCallback,
  UnsubscribeFn,
} from "./types"

export type SelectableTokenType = Token
export type ExtendableChainMeta = Record<string, unknown> | undefined
export type DefaultChainMeta = undefined
export type ExtendableModuleConfig = Record<string, unknown> | undefined
export type DefaultModuleConfig = undefined
export type BaseTransferParams = { tokenId: string; from: string; to: string; amount: string }
export type ExtendableTransferParams = BaseTransferParams | undefined
export type DefaultTransferParams = undefined

export type NewTransferParamsType<T extends Record<string, unknown>> = BaseTransferParams & T

export type TransferTokenTx = { type: "substrate"; tx: UnsignedTransaction }

export type ChainConnectors = { substrate?: ChainConnector; evm?: ChainConnectorEvm }
export type Hydrate = {
  chainConnectors: ChainConnectors
  chaindataProvider: ChaindataProvider
}

export type NewBalanceModule<
  TModuleType extends string,
  TTokenType extends SelectableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
> = (
  hydrate: Hydrate
) => BalanceModule<TModuleType, TTokenType, TChainMeta, TModuleConfig, TTransferParams>

export interface BalanceModule<
  TModuleType extends string,
  TTokenType extends SelectableTokenType,
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
  TTokenType extends SelectableTokenType,
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

  async subscribeBalances(_, callback) {
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
  TTokenType extends SelectableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
> extends BalanceModuleCommon<TModuleType, TTokenType, TTransferParams> {
  /** Pre-processes any substrate chain metadata required by this module ahead of time */
  fetchSubstrateChainMeta(
    chainId: ChainId,
    moduleConfig?: TModuleConfig,
    metadataRpc?: `0x${string}`
  ): Promise<TChainMeta | null>

  /** Detects which tokens are available on a given substrate chain */
  fetchSubstrateChainTokens(
    chainId: ChainId,
    chainMeta: TChainMeta,
    moduleConfig?: TModuleConfig
  ): Promise<Record<TTokenType["id"], TTokenType>>
}

interface BalanceModuleEvm<
  TModuleType extends string,
  TTokenType extends SelectableTokenType,
  TChainMeta extends ExtendableChainMeta = DefaultChainMeta,
  TModuleConfig extends ExtendableModuleConfig = DefaultModuleConfig,
  TTransferParams extends ExtendableTransferParams = DefaultTransferParams
> extends BalanceModuleCommon<TModuleType, TTokenType, TTransferParams> {
  /** Pre-processes any evm chain metadata required by this module ahead of time */
  fetchEvmChainMeta(chainId: ChainId, moduleConfig?: TModuleConfig): Promise<TChainMeta | null>

  /** Detects which tokens are available on a given evm chain */
  fetchEvmChainTokens(
    chainId: ChainId,
    chainMeta: TChainMeta,
    moduleConfig?: TModuleConfig
  ): Promise<Record<TTokenType["id"], TTokenType>>
}

export type SubscriptionResultWithStatus = {
  status: "initialising" | "live"
  data: BalanceJson[]
}

interface BalanceModuleCommon<
  TModuleType extends string,
  TTokenType extends SelectableTokenType,
  TTransferParams extends ExtendableTransferParams
> {
  get type(): TModuleType

  /**
   * Subscribe to balances for this module with optional filtering.
   *
   * If subscriptions are not possible, this function should poll at some reasonable interval.
   */
  subscribeBalances(
    {
      addressesByToken,
      initialBalances,
    }: {
      addressesByToken: AddressesByToken<TTokenType>
      initialBalances?: BalanceJson[]
    },
    callback: SubscriptionCallback<Balances | SubscriptionResultWithStatus>
  ): Promise<UnsubscribeFn>

  /** Fetch balances for this module with optional filtering */
  fetchBalances(addressesByToken: AddressesByToken<TTokenType>): Promise<Balances>

  /** Prepare a tx to transfer some tokens from this module */
  transferToken(transferParams: TTransferParams): Promise<TransferTokenTx | null>
}
