import { Balance, Balances } from "@talismn/balances"
import { Amount, BalanceModule, DefaultBalanceModule, NewBalanceType } from "@talismn/balances"
import { ChainId, NewTokenType } from "@talismn/chaindata-provider"

export type ModuleType = "example"

export type ExampleToken = NewTokenType<
  ModuleType,
  {
    existentialDeposit: string
    chain: { id: ChainId } | null
    genesisHash: string
  }
>

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    ExampleToken: ExampleToken
  }
}

export type ExampleChainMeta = {
  genesisHash: string
}
export type ExampleConfig = Record<string, never>
// TODO: Custom balance type for each module
export type ExampleBalance = NewBalanceType<
  ModuleType,
  {
    free: Amount
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    ExampleBalance: ExampleBalance
  }
}

/** An example of a self-contained balances module */
export const ExampleModule: BalanceModule<
  ModuleType,
  ExampleToken,
  ExampleChainMeta,
  ExampleConfig
> = {
  ...DefaultBalanceModule("example"),

  async fetchSubstrateChainMeta(chainConnector, chaindataProvider, chainId) {
    return { genesisHash: await chainConnector.send(chainId, "chain_getBlockHash", [0]) }
  },

  async fetchSubstrateChainTokens(chainConnector, chaindataProvider, chainId, chainMeta) {
    const type = "example" as const

    const symbol = "DOT"
    const symbol2 = "KSM"

    const id = `${chainId}-${type}-${symbol}`.toLowerCase()
    const id2 = `${chainId}-${type}-${symbol2}`.toLowerCase()

    const { genesisHash } = chainMeta

    const token = {
      id,
      type,
      isTestnet: false,
      decimals: 18,
      symbol,
      existentialDeposit: "0",
      chain: { id: chainId },
      genesisHash,
    }
    const token2 = {
      id: id2,
      type,
      isTestnet: false,
      decimals: 18,
      symbol: symbol2,
      existentialDeposit: "0",
      chain: { id: chainId },
      genesisHash,
    }

    return { [token.id]: token, [token2.id]: token2 }
  },

  async subscribeBalances(chainConnector, chaindataProvider, addressesByToken, callback) {
    let subscribed = true

    const publish = async () => {
      if (!subscribed) return

      const reply = await this.fetchBalances(chainConnector, chaindataProvider, addressesByToken)
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

  async fetchBalances(chainConnector, chaindataProvider, addressesByToken) {
    return new Balances(
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
              })
          )
      )
    )
  },
}
