import {
  Address,
  AddressesByToken,
  Amount,
  Balance,
  BalanceModule,
  Balances,
  DefaultBalanceModule,
  NewBalanceType,
} from "@talismn/balances"
import { EvmChainId, EvmNetworkId, NewTokenType, TokenList } from "@talismn/chaindata-provider"
import ethers from "ethers"

import log from "./log"

type ModuleType = "evm-native"

export const evmNativeTokenId = (chainId: EvmNetworkId, tokenSymbol: string) =>
  `${chainId}-evm-native-${tokenSymbol}`.toLowerCase()

export type EvmNativeToken = NewTokenType<
  ModuleType,
  {
    evmNetwork: { id: EvmNetworkId }
  }
>
export type CustomEvmNativeToken = EvmNativeToken & {
  isCustom: true
}

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    EvmNativeToken: EvmNativeToken
    CustomEvmNativeToken: CustomEvmNativeToken
  }
}

export type EvmNativeChainMeta = {
  isTestnet: boolean
}

export type EvmNativeModuleConfig = {
  symbol?: string
  decimals?: number
}

export type EvmNativeBalance = NewBalanceType<
  ModuleType,
  {
    multiChainId: EvmChainId

    free: Amount
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    EvmNativeBalance: EvmNativeBalance
  }
}

export const EvmNativeModule: BalanceModule<
  ModuleType,
  EvmNativeToken | CustomEvmNativeToken,
  EvmNativeChainMeta,
  EvmNativeModuleConfig
> = {
  ...DefaultBalanceModule("evm-native"),

  async fetchEvmChainMeta(chainConnector, chaindataProvider, chainId) {
    const isTestnet = (await chaindataProvider.getEvmNetwork(chainId))?.isTestnet || false

    return { isTestnet }
  },

  async fetchEvmChainTokens(chainConnector, chaindataProvider, chainId, chainMeta, moduleConfig) {
    const { isTestnet } = chainMeta

    const symbol = moduleConfig?.symbol || "ETH"
    const decimals = typeof moduleConfig?.decimals === "number" ? moduleConfig.decimals : 18

    const id = evmNativeTokenId(chainId, symbol)
    const nativeToken: EvmNativeToken = {
      id,
      type: "evm-native",
      isTestnet,
      symbol,
      decimals,
      logo: `https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets-tokens/${id}.svg`,
      evmNetwork: { id: chainId },
    }

    return { [nativeToken.id]: nativeToken }
  },

  async subscribeBalances(chainConnectors, chaindataProvider, addressesByToken, callback) {
    let subscriptionActive = true
    const subscriptionInterval = 6_000 // 6_000ms == 6 seconds

    const poll = async () => {
      if (!subscriptionActive) return

      try {
        const balances = await this.fetchBalances(
          chainConnectors,
          chaindataProvider,
          addressesByToken
        )

        // TODO: Don't call callback with balances which have not changed since the last poll.
        callback(null, balances)
      } catch (error) {
        callback(error)
      } finally {
        setTimeout(poll, subscriptionInterval)
      }
    }
    setTimeout(poll, subscriptionInterval)

    return () => {
      subscriptionActive = false
    }
  },

  async fetchBalances(chainConnectors, chaindataProvider, addressesByToken) {
    const evmNetworks = await chaindataProvider.evmNetworks()
    const tokens = await chaindataProvider.tokens()

    const balances = (
      await Promise.all(
        Object.entries(addressesByToken).map(async ([tokenId, addresses]) => {
          if (!chainConnectors.evm) throw new Error(`This module requires an evm chain connector`)

          const token = tokens[tokenId]
          if (!token) throw new Error(`Token ${tokenId} not found`)

          // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
          if (token.type !== "evm-native") {
            log.debug(`This module doesn't handle tokens of type ${token.type}`)
            return false
          }

          const evmNetworkId = token.evmNetwork?.id
          if (!evmNetworkId) throw new Error(`Token ${tokenId} has no evm network`)

          const evmNetwork = evmNetworks[evmNetworkId]
          if (!evmNetwork) throw new Error(`Evm network ${evmNetworkId} not found`)

          const provider = chainConnectors.evm.getProviderForEvmNetwork(evmNetwork, { batch: true })
          if (!provider)
            throw new Error(`Could not get rpc provider for evm network ${evmNetworkId}`)

          // fetch all balances
          const balanceRequests = addresses.map(
            async (address) =>
              new Balance({
                source: "evm-native",

                status: "live",

                address: address,
                multiChainId: { evmChainId: evmNetwork.id },
                evmNetworkId,
                tokenId,

                free: await getFreeBalance(provider, address),
              })
          )

          // wait for balance fetches to complete
          const balanceResults = await Promise.allSettled(balanceRequests)

          // filter out errors
          const balances = balanceResults
            .map((result) => {
              if (result.status === "rejected") {
                log.error(result.reason)
                return null
              }

              return result.value
            })
            .filter((balance): balance is Balance => balance !== null)

          // return to caller
          return new Balances(balances)
        })
      )
    ).filter((balances): balances is Balances => balances !== false)

    return balances.reduce((allBalances, balances) => allBalances.add(balances), new Balances([]))
  },
}

async function getFreeBalance(
  provider: ethers.providers.JsonRpcProvider,
  address: Address
): Promise<string> {
  return ((await provider.getBalance(address)).toBigInt() || BigInt("0")).toString()
}
