export class BalanceModule<
  TTokenType extends { id: string },
  TChainExtraMeta extends Record<string, unknown>
> {
  protected chainStorage: ChainStorage

  constructor(chainStorage: ChainStorage) {
    this.chainStorage = chainStorage
  }

  /** Detects whether a given substrate chain has support for this module */
  async supportsSubstrateChain(chainId: ChainId): Promise<boolean> {
    // return Promise.resolve(false)
    return Object.keys(await this.fetchSubstrateChainTokens(chainId)).length > 0
  }
  /** Detects whether a given evm chain has support for this module */
  async supportsEvmChain(chainId: ChainId): Promise<boolean> {
    // return Promise.resolve(false)
    return Object.keys(await this.fetchEvmChainTokens(chainId)).length > 0
  }

  /** Detects which tokens are available on a given substrate chain */
  async fetchSubstrateChainTokens(chainId: ChainId): Promise<Record<TTokenType["id"], TTokenType>> {
    return Promise.resolve({} as Record<TTokenType["id"], TTokenType>)
  }
  /** Detects which tokens are available on a given evm chain */
  async fetchEvmChainTokens(chainId: ChainId): Promise<Record<TTokenType["id"], TTokenType>> {
    return Promise.resolve({} as Record<TTokenType["id"], TTokenType>)
  }

  /** Pre-processes any substrate chain metadata required by this module ahead of time */
  async fetchSubstrateChainMeta(chainId: ChainId): Promise<TChainExtraMeta | null> {
    return null
  }
  /** Pre-processes any evm chain metadata required by this module ahead of time */
  async fetchEvmChainMeta(chainId: ChainId): Promise<TChainExtraMeta | null> {
    return null
  }

  // TODO: Provide a raw output separate to the `Balance` output
  async balances(addressesByToken: AddressesByToken<TTokenType>): Promise<Balances>
  async balances(
    addressesByToken: AddressesByToken<TTokenType>,
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn>
  async balances(
    addressesByToken: AddressesByToken<TTokenType>,
    callback?: SubscriptionCallback<Balances>
  ): Promise<Balances | UnsubscribeFn> {
    // subscription request
    if (callback !== undefined) return await this.subscribeBalances(addressesByToken, callback)

    // one-off request
    return await this.fetchBalances(addressesByToken)
  }

  async subscribeBalances(
    addressesByToken: AddressesByToken<TTokenType>,
    callback: SubscriptionCallback<Balances>
  ): Promise<UnsubscribeFn> {
    callback(new Error("Balance subscriptions are not implemented in this module."))

    return () => {}
  }

  async fetchBalances(addressesByToken: AddressesByToken<TTokenType>): Promise<Balances> {
    throw new Error("Balance fetching is not implemented in this module.")
  }

  // async transferTx
}

// TODO: Move these elsewhere
export type Balances = unknown
export type Balance = unknown
export type TokenId = string
export type ChainId = string
export type Chain = unknown
export interface ChainStorage {
  get(chainId: ChainId): Promise<Chain | null>
}
export type Address = string
/**
 * A callback with either an error or a result.
 */
export interface SubscriptionCallback<Result> {
  (error: null, result: Result): void
  (error: any, result?: never): void
}
/**
 * A function which cancels a subscription when called.
 */
export type UnsubscribeFn = () => void
export type AddressesByToken<TTokenType extends { id: string }> = Record<
  TTokenType["id"],
  Address[]
>
