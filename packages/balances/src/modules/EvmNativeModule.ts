import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import {
  BalancesConfigTokenParams,
  EvmChainId,
  EvmNetworkId,
  EvmNetworkList,
  NewTokenType,
  TokenList,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { hasOwnProperty, isEthereumAddress } from "@talismn/util"
import isEqual from "lodash/isEqual"
import { PublicClient } from "viem"

import { DefaultBalanceModule, NewBalanceModule } from "../BalanceModule"
import log from "../log"
import {
  Address,
  AddressesByToken,
  Amount,
  Balance,
  BalanceJsonList,
  Balances,
  NewBalanceType,
} from "../types"
import { abiMulticall } from "./abis/multicall"

type ModuleType = "evm-native"

export const evmNativeTokenId = (chainId: EvmNetworkId) =>
  `${chainId}-evm-native`.toLowerCase().replace(/ /g, "-")

const getEvmNetworkIdFromTokenId = (tokenId: string) => {
  const evmNetworkId = tokenId.split("-")[0] as EvmNetworkId
  if (!evmNetworkId) throw new Error(`Can't detect chainId for token ${tokenId}`)
  return evmNetworkId
}

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
} & BalancesConfigTokenParams

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
     * This method is currently executed on [a squid](https://github.com/TalismanSociety/chaindata-squid/blob/0ee02818bf5caa7362e3f3664e55ef05ec8df078/src/steps/updateEvmNetworksFromGithub.ts#L280-L284).
     * In a future version of the balance libraries, we may build some kind of async scheduling system which will keep the chainmeta for each chain up to date without relying on a squid.
     */
    async fetchEvmChainMeta(chainId) {
      const isTestnet = (await chaindataProvider.evmNetworkById(chainId))?.isTestnet || false

      return { isTestnet }
    },

    /**
     * This method is currently executed on [a squid](https://github.com/TalismanSociety/chaindata-squid/blob/0ee02818bf5caa7362e3f3664e55ef05ec8df078/src/steps/updateEvmNetworksFromGithub.ts#L338-L343).
     * In a future version of the balance libraries, we may build some kind of async scheduling system which will keep the list of tokens for each chain up to date without relying on a squid.
     */
    async fetchEvmChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet } = chainMeta

      const symbol = moduleConfig?.symbol ?? "ETH"
      const decimals = typeof moduleConfig?.decimals === "number" ? moduleConfig.decimals : 18

      const id = evmNativeTokenId(chainId)
      const nativeToken: EvmNativeToken = {
        id,
        type: "evm-native",
        isTestnet,
        isDefault: true,
        symbol,
        decimals,
        logo: moduleConfig?.logo || githubTokenLogoUrl(id),
        evmNetwork: { id: chainId },
      }

      if (moduleConfig?.symbol) nativeToken.symbol = moduleConfig?.symbol
      if (moduleConfig?.coingeckoId) nativeToken.coingeckoId = moduleConfig?.coingeckoId
      if (moduleConfig?.dcentName) nativeToken.dcentName = moduleConfig?.dcentName
      if (moduleConfig?.mirrorOf) nativeToken.mirrorOf = moduleConfig?.mirrorOf

      return { [nativeToken.id]: nativeToken }
    },

    getPlaceholderBalance(tokenId, address): EvmNativeBalance {
      const evmNetworkId = getEvmNetworkIdFromTokenId(tokenId)
      return {
        source: "evm-native",
        status: "initializing",
        address: address,
        multiChainId: { evmChainId: evmNetworkId },
        evmNetworkId,
        tokenId,
        free: "0",
      }
    },

    async subscribeBalances(addressesByToken, callback) {
      // TODO remove
      log.debug("subscribeBalances", "evm-native", addressesByToken)
      let subscriptionActive = true
      const subscriptionInterval = 6_000 // 6_000ms == 6 seconds
      const initDelay = 500 // 500ms == 0.5 seconds
      const cache = new Map<EvmNetworkId, BalanceJsonList>()

      // for chains with a zero balance we only call fetchBalances once every 5 subscriptionIntervals
      // if subscriptionInterval is 6 seconds, this means we only poll chains with a zero balance every 30 seconds
      let zeroBalanceSubscriptionIntervalCounter = 0

      const evmNetworks = await chaindataProvider.evmNetworksById()
      const tokens = await chaindataProvider.tokensById()

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

              if (!chainConnectors.evm)
                throw new Error(`This module requires an evm chain connector`)
              const balances = await fetchBalances(
                chainConnectors.evm,
                evmNetworks,
                tokens,
                tokenAddresses
              )

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

      setTimeout(poll, initDelay)

      return () => {
        subscriptionActive = false
      }
    },

    async fetchBalances(addressesByToken) {
      if (!chainConnectors.evm) throw new Error(`This module requires an evm chain connector`)

      const evmNetworks = await chaindataProvider.evmNetworksById()
      const tokens = await chaindataProvider.tokensById()

      return fetchBalances(chainConnectors.evm, evmNetworks, tokens, addressesByToken)
    },
  }
}

const fetchBalances = async (
  evmChainConnector: ChainConnectorEvm,
  evmNetworks: EvmNetworkList,
  tokens: TokenList,
  addressesByToken: AddressesByToken<EvmNativeToken | CustomEvmNativeToken>
) => {
  const balances = (
    await Promise.allSettled(
      Object.entries(addressesByToken).map(async ([tokenId, addresses]) => {
        if (!evmChainConnector) throw new Error(`This module requires an evm chain connector`)

        const token = tokens[tokenId]
        if (!token) throw new Error(`Token ${tokenId} not found`)

        // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
        if (token.type !== "evm-native")
          throw new Error(`This module doesn't handle tokens of type ${token.type}`)

        const evmNetworkId = token.evmNetwork?.id
        if (!evmNetworkId) throw new Error(`Token ${tokenId} has no evm network`)

        const evmNetwork = evmNetworks[evmNetworkId]
        if (!evmNetwork) throw new Error(`Evm network ${evmNetworkId} not found`)

        const publicClient = await evmChainConnector.getPublicClientForEvmNetwork(evmNetworkId)

        if (!publicClient)
          throw new Error(`Could not get rpc provider for evm network ${evmNetworkId}`)

        // fetch all balances
        const freeBalances = await getFreeBalances(publicClient, addresses)

        const balanceResults = addresses
          .map((address, i) => {
            if (freeBalances[i] === "error") return false

            return new Balance({
              source: "evm-native",

              status: "live",

              address: address,
              multiChainId: { evmChainId: evmNetwork.id },
              evmNetworkId,
              tokenId,

              free: freeBalances[i].toString(),
            })
          })
          .filter((balance): balance is Balance => balance !== false)

        // return to caller
        return new Balances(balanceResults)
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
}

async function getFreeBalance(
  publicClient: PublicClient,
  address: Address
): Promise<bigint | "error"> {
  if (!isEthereumAddress(address)) return 0n

  try {
    return await publicClient.getBalance({ address })
  } catch (error) {
    const errorMessage = hasOwnProperty(error, "shortMessage")
      ? error.shortMessage
      : hasOwnProperty(error, "message")
      ? error.message
      : error
    log.warn(
      `Failed to get balance from chain ${publicClient.chain?.id} for address ${address}: ${errorMessage}`
    )
    return "error"
  }
}

async function getFreeBalances(
  publicClient: PublicClient,
  addresses: Address[]
): Promise<(bigint | "error")[]> {
  // if multicall is available, use it to save RPC rate limits
  if (publicClient.batch?.multicall && publicClient.chain?.contracts?.multicall3?.address) {
    try {
      const ethAddresses = addresses.filter(isEthereumAddress)

      const addressMulticall = publicClient.chain.contracts.multicall3.address

      const callResults = await publicClient.multicall({
        contracts: ethAddresses.map((address) => ({
          address: addressMulticall,
          abi: abiMulticall,
          functionName: "getEthBalance",
          args: [address],
        })),
      })

      const ethBalanceResults = Object.fromEntries(
        ethAddresses.map((address, i) => {
          const { error } = callResults[i]
          if (error) {
            const errorMessage = hasOwnProperty(error, "shortMessage")
              ? error.shortMessage
              : hasOwnProperty(error, "message")
              ? error.message
              : error
            log.warn(
              `Failed to get balance from chain ${publicClient.chain?.id} for address ${address}: ${errorMessage}`
            )
          }

          return [address, callResults[i].result ?? ("error" as const)]
        })
      )

      // default to 0 for non evm addresses
      return addresses.map((address) =>
        ethBalanceResults[address] ? BigInt(ethBalanceResults[address]) : 0n
      )
    } catch (err) {
      const errorMessage = hasOwnProperty(err, "shortMessage")
        ? err.shortMessage
        : hasOwnProperty(err, "message")
        ? err.message
        : err
      log.warn(
        `Failed to get balance from chain ${publicClient.chain?.id} for ${addresses.length} addresses: ${errorMessage}`
      )
      return addresses.map(() => "error")
    }
  }

  return Promise.all(addresses.map((address) => getFreeBalance(publicClient, address)))
}
