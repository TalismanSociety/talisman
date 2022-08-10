import {
  Balance,
  BalanceModule,
  Balances,
  DefaultBalanceModule,
  IBalanceStorage,
} from "@talismn/balances"
import { ChainId } from "@talismn/chaindata-provider"
import { IToken } from "@talismn/chaindata-provider/dist/types/Token"

type ModuleType = "example"

export type ExampleToken = IToken & {
  type: ModuleType
  existentialDeposit: string
  chain: { id: ChainId } | null
}

declare module "@talismn/chaindata-provider/dist/types/Token" {
  export interface TokenTypes {
    ExampleToken: ExampleToken
  }
}

export type ExampleChainMeta = {
  genesisHash: string
}
export type ExampleConfig = Record<string, never>
// TODO: Custom balance type for each module
export type ExampleBalanceStorage = IBalanceStorage & {
  source: ModuleType

  free: string
}

declare module "@talismn/balances/dist/types/storages" {
  export interface BalanceStorages {
    ExampleBalanceStorage: ExampleBalanceStorage
  }
}

/** An example of a self-contained balances module */
export const ExampleModule: BalanceModule<ExampleToken, ExampleChainMeta, ExampleConfig> = {
  ...DefaultBalanceModule(),

  async fetchSubstrateChainMeta(chainConnector, chainId) {
    return { genesisHash: await chainConnector.send(chainId, "chain_getBlockHash", [0]) }
  },

  async fetchSubstrateChainTokens(chainConnector, chainId) {
    const type = "example" as const

    const symbol = "DOT"
    const symbol2 = "KSM"

    const id = `${chainId}-${type}-${symbol}`.toLowerCase()
    const id2 = `${chainId}-${type}-${symbol2}`.toLowerCase()

    const token = {
      id,
      type,
      isTestnet: false,
      decimals: 18,
      symbol,
      existentialDeposit: "0",
      chain: { id: chainId },
    }
    const token2 = {
      id: id2,
      type,
      isTestnet: false,
      decimals: 18,
      symbol: symbol2,
      existentialDeposit: "0",
      chain: { id: chainId },
    }

    return { [token.id]: token, [token2.id]: token2 }
  },

  async subscribeBalances(chainConnector, addressesByToken, callback) {
    let subscribed = true

    const publish = () => {
      if (!subscribed) return

      const reply = new Balances(
        Object.entries(addressesByToken).flatMap(([tokenId, addresses]) =>
          addresses
            .map((address) => [address, tokenId.split("-")[0]])
            .map(
              ([address, chainId]) =>
                new Balance({
                  source: "example",
                  status: "live",
                  address,
                  multiChainId: { subChainId: chainId },
                  chainId,
                  tokenId,

                  free: ((Math.floor(Math.random() * 9) + 1) * Math.pow(10, 18)).toString(),
                  // reserved: "0",
                  // miscFrozen: "0",
                  // feeFrozen: "0",
                })
            )
        )
      )
      callback(null, reply)

      const updateResponseMs = 5000 // 5s
      setTimeout(publish, updateResponseMs)
    }

    const firstResponseMs = 50 // 0.05s
    setTimeout(publish, firstResponseMs)

    return () => {
      subscribed = false
    }
  },

  // async fetchBalances(chainConnector,addressesByToken) {
  //   return null
  // },
}

// /** An example of a self-contained balances module */
// export class ExampleModuleOldClassBased implements BalanceModule<ExampleToken, ExampleChainMeta> {
//   // async supportsSubstrateChain(chainId: ChainId): Promise<boolean> {
//   //   const chain = await this.chainStorage.get(chainId)
//   //   throw new Error("Not implemented")
//   // }
//   // async supportsEvmChain(chainId: ChainId): Promise<boolean> {
//   //   const chain = await this.chainStorage.get(chainId)
//   //   throw new Error("Not implemented")
//   // }

//   async fetchSubstrateChainTokens(
//     chainId: ChainId
//   ): Promise<Record<ExampleToken["id"], ExampleToken>> {
//     const chain = await this.chainStorage.get(chainId)
//     throw new Error("Not implemented")
//   }
//   async fetchEvmChainTokens(chainId: ChainId): Promise<Record<ExampleToken["id"], ExampleToken>> {
//     const chain = await this.chainStorage.get(chainId)
//     throw new Error("Not implemented")
//   }

//   /** Pre-processes any metadata required by this module ahead of time */
//   async fetchSubstrateChainMeta(chainId: ChainId): Promise<ExampleChainMeta> {
//     const chain = await this.chainStorage.get(chainId)
//     throw new Error("Not implemented")
//   }
//   async fetchEvmChainMeta(chainId: ChainId): Promise<ExampleChainMeta> {
//     const chain = await this.chainStorage.get(chainId)
//     throw new Error("Not implemented")
//   }

//   // /**
//   //  * Subscribe to balances for this module with optional filtering.
//   //  *
//   //  * If subscriptions are not possible, this function should poll at some reasonable interval.
//   //  */
//   // async subscribeBalances(
//   //   addresses: Address[],
//   //   tokens: Array<Pick<ExampleToken, "id">>,
//   //   callback: SubscriptionCallback<Balances>
//   // ): Promise<UnsubscribeFn> {
//   //   throw new Error("Not implemented")
//   // }

//   // /** Fetch balances for this module with optional filtering */
//   // async fetchBalances(
//   //   addresses: Address[],
//   //   tokens: Array<Pick<ExampleToken, "id">>,
//   //   callback?: SubscriptionCallback<Balances>
//   // ): Promise<Balances | UnsubscribeFn> {
//   //   throw new Error("Not implemented")
//   // }
// }

// const exampleModule = new ExampleModule()

// export {}
