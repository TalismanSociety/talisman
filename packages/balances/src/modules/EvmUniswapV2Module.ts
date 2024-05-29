import { assert } from "@polkadot/util"
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
import BigNumber from "bignumber.js"
import isEqual from "lodash/isEqual"
import { PublicClient } from "viem"

import { DefaultBalanceModule, NewBalanceModule } from "../BalanceModule"
import log from "../log"
import {
  AddressesByToken,
  Amount,
  Balance,
  BalanceJsonList,
  Balances,
  ExtraAmount,
  NewBalanceType,
} from "../types"
import { uniswapV2PairAbi } from "./abis/uniswapV2Pair"

export { uniswapV2PairAbi }

type ModuleType = "evm-uniswapv2"

export const evmUniswapV2TokenId = (
  chainId: EvmNetworkId,
  poolAddress: EvmUniswapV2Token["poolAddress"]
) => `${chainId}-evm-uniswapv2-${poolAddress}`.toLowerCase()

const getEvmNetworkIdFromTokenId = (tokenId: string) => {
  const evmNetworkId = tokenId.split("-")[0] as EvmNetworkId
  if (!evmNetworkId) throw new Error(`Can't detect chainId for token ${tokenId}`)
  return evmNetworkId
}

export type EvmUniswapV2Token = NewTokenType<
  ModuleType,
  {
    poolAddress: string
    symbol0: string
    symbol1: string
    decimals0: number
    decimals1: number
    tokenAddress0: string
    tokenAddress1: string
    coingeckoId0?: string
    coingeckoId1?: string
    evmNetwork: { id: EvmNetworkId } | null
  }
>
export type CustomEvmUniswapV2Token = EvmUniswapV2Token & {
  isCustom: true
  image?: string
}

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    EvmUniswapV2Token: EvmUniswapV2Token
    CustomEvmUniswapV2Token: CustomEvmUniswapV2Token
  }
}

export type EvmUniswapV2ChainMeta = {
  isTestnet: boolean
}

export type EvmUniswapV2ModuleConfig = {
  pools?: Array<
    {
      poolAddress?: string
      decimals?: number
      symbol0?: string
      symbol1?: string
      decimals0?: number
      decimals1?: number
      tokenAddress0?: string
      tokenAddress1?: string
      coingeckoId0?: string
      coingeckoId1?: string
    } & BalancesConfigTokenParams
  >
}

export type EvmUniswapV2Balance = NewBalanceType<
  ModuleType,
  {
    multiChainId: EvmChainId

    free: Amount
    extra: Array<ExtraAmount<string>>
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    EvmUniswapV2Balance: EvmUniswapV2Balance
  }
}

export const EvmUniswapV2Module: NewBalanceModule<
  ModuleType,
  EvmUniswapV2Token | CustomEvmUniswapV2Token,
  EvmUniswapV2ChainMeta,
  EvmUniswapV2ModuleConfig
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.evm
  assert(chainConnector, "This module requires an evm chain connector")

  return {
    ...DefaultBalanceModule("evm-uniswapv2"),

    async fetchEvmChainMeta(chainId) {
      const isTestnet = (await chaindataProvider.evmNetworkById(chainId))?.isTestnet || false

      return { isTestnet }
    },

    async fetchEvmChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet } = chainMeta

      const tokens: Record<string, EvmUniswapV2Token> = {}
      for (const tokenConfig of moduleConfig?.pools ?? []) {
        const {
          poolAddress,
          decimals,
          symbol0,
          symbol1,
          decimals0,
          decimals1,
          tokenAddress0,
          tokenAddress1,
          coingeckoId0,
          coingeckoId1,
        } = tokenConfig

        if (
          !poolAddress ||
          decimals === undefined ||
          symbol0 === undefined ||
          decimals0 === undefined ||
          symbol1 === undefined ||
          decimals1 === undefined ||
          tokenAddress0 === undefined ||
          tokenAddress1 === undefined
        ) {
          log.warn("ignoring token on chain %s", chainId, tokenConfig)
          continue
        }

        const id = evmUniswapV2TokenId(chainId, poolAddress)
        const token: EvmUniswapV2Token = {
          id,
          type: "evm-uniswapv2",
          isTestnet,
          isDefault: tokenConfig.isDefault ?? false,
          symbol: `${symbol0 ?? "UNKNOWN"}/${symbol1 ?? "UNKNOWN"}`,
          decimals,
          logo: tokenConfig?.logo || githubTokenLogoUrl("uniswap"),
          symbol0,
          decimals0,
          symbol1,
          decimals1,
          poolAddress,
          tokenAddress0,
          tokenAddress1,
          coingeckoId0,
          coingeckoId1,
          evmNetwork: { id: chainId },
        }

        if (tokenConfig?.symbol) token.symbol = tokenConfig?.symbol
        if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
        if (tokenConfig?.dcentName) token.dcentName = tokenConfig?.dcentName
        if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

        tokens[token.id] = token
      }

      return tokens
    },

    getPlaceholderBalance(tokenId, address): EvmUniswapV2Balance {
      const evmNetworkId = getEvmNetworkIdFromTokenId(tokenId)
      return {
        source: "evm-uniswapv2",
        status: "initializing",
        address: address,
        multiChainId: { evmChainId: evmNetworkId },
        evmNetworkId,
        tokenId,
        free: "0",
        extra: [],
      }
    },

    async subscribeBalances(addressesByToken, callback) {
      let subscriptionActive = true
      const subscriptionInterval = 6_000 // 6_000ms == 6 seconds
      const initDelay = 1_500 // 1_500ms == 1.5 seconds
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
          // regroup tokens by network
          const addressesByTokenByEvmNetwork = groupAddressesByTokenByEvmNetwork(
            addressesByToken,
            tokens
          )

          // fetch balance for each network sequentially to prevent creating a big queue of http requests (browser can only handle 2 at a time)
          for (const [evmNetworkId, addressesByToken] of Object.entries(
            addressesByTokenByEvmNetwork
          )) {
            const cached = cache.get(evmNetworkId)
            if (
              cached &&
              zeroBalanceSubscriptionIntervalCounter !== 0 &&
              new Balances(cached).each.reduce((sum, b) => sum + b.total.planck, 0n) === 0n
            ) {
              // only poll empty token balances every 5 subscriptionIntervals
              continue
            }

            try {
              if (!chainConnectors.evm)
                throw new Error(`This module requires an evm chain connector`)
              const balances = await fetchBalances(
                chainConnectors.evm,
                evmNetworks,
                tokens,
                addressesByToken
              )

              // Don't call callback with balances which have not changed since the last poll.
              const json = balances.toJSON()
              if (!isEqual(cached, json)) {
                cache.set(evmNetworkId, json)
                // cache contains all balances for a given network, filter out balances that didn't change
                const changes = Object.entries(json).filter(
                  ([id, balance]) => !isEqual(cached?.[id], balance)
                )
                if (changes.length) callback(null, new Balances(Object.fromEntries(changes)))
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
  addressesByToken: AddressesByToken<EvmUniswapV2Token>
) => {
  const addressesByTokenGroupedByEvmNetwork = groupAddressesByTokenByEvmNetwork(
    addressesByToken,
    tokens
  )

  const balances = (
    await Promise.allSettled(
      Object.entries(addressesByTokenGroupedByEvmNetwork).map(
        async ([evmNetworkId, addressesByToken]) => {
          if (!evmChainConnector) throw new Error(`This module requires an evm chain connector`)

          const evmNetwork = evmNetworks[evmNetworkId]
          if (!evmNetwork) throw new Error(`Evm network ${evmNetworkId} not found`)

          const publicClient = await evmChainConnector.getPublicClientForEvmNetwork(evmNetworkId)
          if (!publicClient)
            throw new Error(`Could not get rpc provider for evm network ${evmNetworkId}`)

          const tokensAndAddresses = Object.entries(addressesByToken).reduce(
            (tokensAndAddresses, [tokenId, addresses]) => {
              const token = tokens[tokenId]
              if (!token) {
                log.debug(`Token ${tokenId} not found`)
                return tokensAndAddresses
              }

              // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
              if (token.type !== "evm-uniswapv2") {
                log.debug(`This module doesn't handle tokens of type ${token.type}`)
                return tokensAndAddresses
              }

              const tokenAndAddresses: [EvmUniswapV2Token | CustomEvmUniswapV2Token, string[]] = [
                token,
                addresses,
              ]

              return [...tokensAndAddresses, tokenAndAddresses]
            },
            [] as Array<[EvmUniswapV2Token | CustomEvmUniswapV2Token, string[]]>
          )

          // fetch all balances
          const balanceRequests = tokensAndAddresses.flatMap(([token, addresses]) => {
            return addresses.map(
              async (address) =>
                new Balance({
                  source: "evm-uniswapv2",

                  status: "live",

                  address: address,
                  multiChainId: { evmChainId: evmNetwork.id },
                  evmNetworkId,
                  tokenId: token.id,

                  ...(await getPoolBalance(
                    publicClient,
                    token.poolAddress as `0x${string}`,
                    address as `0x${string}`
                  )),
                })
            )
          })

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
        }
      )
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

function groupAddressesByTokenByEvmNetwork(
  addressesByToken: AddressesByToken<EvmUniswapV2Token>,
  tokens: TokenList
): Record<string, AddressesByToken<EvmUniswapV2Token>> {
  return Object.entries(addressesByToken).reduce((byChain, [tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.error(`Token ${tokenId} not found`)
      return byChain
    }

    const chainId = token.evmNetwork?.id
    if (!chainId) {
      log.error(`Token ${tokenId} has no evm network`)
      return byChain
    }

    if (!byChain[chainId]) byChain[chainId] = {}
    byChain[chainId][tokenId] = addresses

    return byChain
  }, {} as Record<string, AddressesByToken<EvmUniswapV2Token>>)
}

async function getPoolBalance(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  accountAddress: `0x${string}`
): Promise<{ free: Amount; extra: Array<ExtraAmount<string>> }> {
  if (!isEthereumAddress(accountAddress)) return { free: "0", extra: [] }

  try {
    const [
      { result: _balanceOf },
      { result: _totalSupply },
      { result: reserves },
      // { result: kLast },
      // { result: price0CumulativeLast },
      // { result: price1CumulativeLast },
    ] = await publicClient.multicall({
      contracts: [
        {
          abi: uniswapV2PairAbi,
          address: contractAddress,
          functionName: "balanceOf",
          args: [accountAddress],
        },
        { abi: uniswapV2PairAbi, address: contractAddress, functionName: "totalSupply" },
        { abi: uniswapV2PairAbi, address: contractAddress, functionName: "getReserves" },
        // { abi: uniswapV2PairAbi, address: contractAddress, functionName: "kLast" },
        // { abi: uniswapV2PairAbi, address: contractAddress, functionName: "price0CumulativeLast" },
        // { abi: uniswapV2PairAbi, address: contractAddress, functionName: "price1CumulativeLast" },
      ],
    })

    const [_reserve0, _reserve1] = reserves ?? []

    const extraWithLabel = (label: string, amount: string): ExtraAmount<string> => ({
      label,
      amount,
    })

    const balanceOf = String(_balanceOf ?? 0n)
    const totalSupply = extraWithLabel("totalSupply", String(_totalSupply ?? 0n))
    const reserve0 = extraWithLabel("reserve0", String(_reserve0 ?? 0n))
    const reserve1 = extraWithLabel("reserve1", String(_reserve1 ?? 0n))

    const ratio = BigNumber(balanceOf).div(totalSupply.amount === "0" ? "1" : totalSupply.amount)
    const holding0 = extraWithLabel("holding0", ratio.times(reserve0.amount).toString(10))
    const holding1 = extraWithLabel("holding1", ratio.times(reserve1.amount).toString(10))

    return { free: balanceOf, extra: [totalSupply, reserve0, reserve1, holding0, holding1] }
  } catch (error) {
    const errorMessage = hasOwnProperty(error, "shortMessage")
      ? error.shortMessage
      : hasOwnProperty(error, "message")
      ? error.message
      : error
    log.warn(
      `Failed to get balance from contract ${contractAddress} (chain ${publicClient.chain?.id}) for address ${accountAddress}: ${errorMessage}`
    )
    throw new Error(
      `Failed to get balance from contract ${contractAddress} (chain ${publicClient.chain?.id}) for address ${accountAddress}`,
      { cause: error as Error }
    )
  }
}
