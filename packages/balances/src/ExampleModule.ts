import { Address, BalanceModule, Chain, ChainId, ChainStorage, TokenId } from "./BalanceModule"

export type ExampleToken = {
  id: TokenId
  type: "example"
}
export type ExampleChainMeta = {
  currencyId: string
}

/** An example of a self-contained balances module */
export class ExampleModule extends BalanceModule<ExampleToken, ExampleChainMeta> {
  // async supportsSubstrateChain(chainId: ChainId): Promise<boolean> {
  //   const chain = await this.chainStorage.get(chainId)
  //   throw new Error("Not implemented")
  // }
  // async supportsEvmChain(chainId: ChainId): Promise<boolean> {
  //   const chain = await this.chainStorage.get(chainId)
  //   throw new Error("Not implemented")
  // }

  async fetchSubstrateChainTokens(
    chainId: ChainId
  ): Promise<Record<ExampleToken["id"], ExampleToken>> {
    const chain = await this.chainStorage.get(chainId)
    throw new Error("Not implemented")
  }
  async fetchEvmChainTokens(chainId: ChainId): Promise<Record<ExampleToken["id"], ExampleToken>> {
    const chain = await this.chainStorage.get(chainId)
    throw new Error("Not implemented")
  }

  /** Pre-processes any metadata required by this module ahead of time */
  async fetchSubstrateChainMeta(chainId: ChainId): Promise<ExampleChainMeta> {
    const chain = await this.chainStorage.get(chainId)
    throw new Error("Not implemented")
  }
  async fetchEvmChainMeta(chainId: ChainId): Promise<ExampleChainMeta> {
    const chain = await this.chainStorage.get(chainId)
    throw new Error("Not implemented")
  }

  // /**
  //  * Subscribe to balances for this module with optional filtering.
  //  *
  //  * If subscriptions are not possible, this function should poll at some reasonable interval.
  //  */
  // async subscribeBalances(
  //   addresses: Address[],
  //   tokens: Array<Pick<ExampleToken, "id">>,
  //   callback: SubscriptionCallback<Balances>
  // ): Promise<UnsubscribeFn> {
  //   throw new Error("Not implemented")
  // }

  // /** Fetch balances for this module with optional filtering */
  // async fetchBalances(
  //   addresses: Address[],
  //   tokens: Array<Pick<ExampleToken, "id">>,
  //   callback?: SubscriptionCallback<Balances>
  // ): Promise<Balances | UnsubscribeFn> {
  //   throw new Error("Not implemented")
  // }
}

// const exampleModule = new ExampleModule()

export {}
