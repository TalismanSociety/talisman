import {
  Address,
  Amount,
  Balance,
  BalanceJsonList,
  Balances,
  DefaultBalanceModule,
  NewBalanceModule,
  NewBalanceType,
} from "@talismn/balances"
import {
  EvmChainId,
  EvmNetworkId,
  NewTokenType,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { hasOwnProperty, isEthereumAddress } from "@talismn/util"
import { ethers } from "ethers"
import isEqual from "lodash/isEqual"

import log from "./log"

type ModuleType = "evm-native"

export const evmNativeTokenId = (chainId: EvmNetworkId, tokenSymbol: string) =>
  `${chainId}-evm-native-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

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
  coingeckoId?: string
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

export const EvmNativeModule: NewBalanceModule<
  ModuleType,
  EvmNativeToken | CustomEvmNativeToken,
  EvmNativeChainMeta,
  EvmNativeModuleConfig
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate

  return {
    ...DefaultBalanceModule("evm-native"),

    /**
     * This method is currently executed on [a squid](https://github.com/talisman-labs/chaindata-squid/blob/0ee02818bf5caa7362e3f3664e55ef05ec8df078/src/steps/updateEvmNetworksFromGithub.ts#L280-L284).
     * In a future version of the balance libraries, we may build some kind of async scheduling system which will keep the chainmeta for each chain up to date without relying on a squid.
     */
    async fetchEvmChainMeta(chainId) {
      const isTestnet = (await chaindataProvider.getEvmNetwork(chainId))?.isTestnet || false

      return { isTestnet }
    },

    /**
     * This method is currently executed on [a squid](https://github.com/talisman-labs/chaindata-squid/blob/0ee02818bf5caa7362e3f3664e55ef05ec8df078/src/steps/updateEvmNetworksFromGithub.ts#L338-L343).
     * In a future version of the balance libraries, we may build some kind of async scheduling system which will keep the list of tokens for each chain up to date without relying on a squid.
     */
    async fetchEvmChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet } = chainMeta

      const symbol = moduleConfig?.symbol || "ETH"
      const decimals = typeof moduleConfig?.decimals === "number" ? moduleConfig.decimals : 18
      const coingeckoId =
        typeof moduleConfig?.coingeckoId === "string" ? moduleConfig.coingeckoId : undefined

      const id = evmNativeTokenId(chainId, symbol)
      const nativeToken: EvmNativeToken = {
        id,
        type: "evm-native",
        isTestnet,
        symbol,
        decimals,
        logo: githubTokenLogoUrl(id),
        coingeckoId,
        evmNetwork: { id: chainId },
      }

      return { [nativeToken.id]: nativeToken }
    },

    async subscribeBalances(addressesByToken, callback) {
      let subscriptionActive = true
      const subscriptionInterval = 6_000 // 6_000ms == 6 seconds
      const cache = new Map<EvmNetworkId, BalanceJsonList>()

      // for chains with a zero balance we only call fetchBalances once every 5 subscriptionIntervals
      // if subscriptionInterval is 6 seconds, this means we only poll chains with a zero balance every 30 seconds
      let zeroBalanceSubscriptionIntervalCounter = 0

      const poll = async () => {
        if (!subscriptionActive) return

        zeroBalanceSubscriptionIntervalCounter = (zeroBalanceSubscriptionIntervalCounter + 1) % 5

        try {
          // fetch balance for each network sequentially to prevent creating a big queue of http requests (browser can only handle 2 at a time)
          // since these are native tokens (1 per network), we can iterate on tokens
          for (const tokenId of Object.keys(addressesByToken)) {
            const cached = cache.get(tokenId)
            if (
              cached &&
              zeroBalanceSubscriptionIntervalCounter !== 0 &&
              new Balances(cached).each.reduce((sum, b) => sum + b.total.planck, 0n) === 0n
            ) {
              // only poll empty token balances every 5 subscriptionIntervals
              continue
            }

            try {
              const tokenAddresses = { [tokenId]: addressesByToken[tokenId] }

              const balances = await this.fetchBalances(tokenAddresses)

              // Don't call callback with balances which have not changed since the last poll.
              const json = balances.toJSON()
              if (!isEqual(cache.get(tokenId), json)) {
                cache.set(tokenId, json)
                callback(null, balances)
              }
            } catch (err) {
              callback(err)
            }
          }
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

    async fetchBalances(addressesByToken) {
      const evmNetworks = await chaindataProvider.evmNetworks()
      const tokens = await chaindataProvider.tokens()

      const balances = (
        await Promise.allSettled(
          Object.entries(addressesByToken).map(async ([tokenId, addresses]) => {
            if (!chainConnectors.evm) throw new Error(`This module requires an evm chain connector`)

            const token = tokens[tokenId]
            if (!token) throw new Error(`Token ${tokenId} not found`)

            // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
            if (token.type !== "evm-native")
              throw new Error(`This module doesn't handle tokens of type ${token.type}`)

            const evmNetworkId = token.evmNetwork?.id
            if (!evmNetworkId) throw new Error(`Token ${tokenId} has no evm network`)

            const evmNetwork = evmNetworks[evmNetworkId]
            if (!evmNetwork) throw new Error(`Evm network ${evmNetworkId} not found`)

            const provider = await chainConnectors.evm.getProviderForEvmNetwork(evmNetwork, {
              batch: true,
            })
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
                  log.debug(result.reason)
                  return false
                }
                return result.value
              })
              .filter((balance): balance is Balance => balance !== false)

            // return to caller
            return new Balances(balances)
          })
        )
      )
        .map((result) => {
          if (result.status === "rejected") {
            log.debug(result.reason)
            return false
          }
          return result.value
        })
        .filter((balances): balances is Balances => balances !== false)

      return balances.reduce((allBalances, balances) => allBalances.add(balances), new Balances([]))
    },
  }
}

async function getFreeBalance(
  provider: ethers.providers.JsonRpcProvider,
  address: Address
): Promise<string> {
  if (!isEthereumAddress(address)) return "0"

  try {
    return ((await provider.getBalance(address)).toBigInt() ?? 0n).toString()
  } catch (error) {
    const errorMessage = hasOwnProperty(error, "message") ? error.message : error
    log.warn(
      `Failed to get balance from chain ${provider.network.chainId} for address ${address}: ${errorMessage}`
    )
    throw new Error(
      `Failed to get balance from chain ${provider.network.chainId} for address ${address}`,
      { cause: error as Error }
    )
  }
}
