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
  NewBalanceType,
} from "../types"
import { erc20Abi } from "./abis/erc20"

export { erc20Abi }

type ModuleType = "evm-erc20"

export const evmErc20TokenId = (
  chainId: EvmNetworkId,
  tokenContractAddress: EvmErc20Token["contractAddress"]
) => `${chainId}-evm-erc20-${tokenContractAddress}`.toLowerCase()

const getEvmNetworkIdFromTokenId = (tokenId: string) => {
  const evmNetworkId = tokenId.split("-")[0] as EvmNetworkId
  if (!evmNetworkId) throw new Error(`Can't detect chainId for token ${tokenId}`)
  return evmNetworkId
}

export type EvmErc20Token = NewTokenType<
  ModuleType,
  {
    contractAddress: string
    evmNetwork: { id: EvmNetworkId } | null
  }
>
export type CustomEvmErc20Token = EvmErc20Token & {
  isCustom: true
  image?: string
}

declare module "@talismn/chaindata-provider/plugins" {
  export interface PluginTokenTypes {
    EvmErc20Token: EvmErc20Token
    CustomEvmErc20Token: CustomEvmErc20Token
  }
}

export type EvmErc20ChainMeta = {
  isTestnet: boolean
}

export type EvmErc20ModuleConfig = {
  tokens?: Array<
    {
      symbol?: string
      decimals?: number
      contractAddress?: string
    } & BalancesConfigTokenParams
  >
}

export type EvmErc20Balance = NewBalanceType<
  ModuleType,
  {
    multiChainId: EvmChainId

    free: Amount
  }
>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    EvmErc20Balance: EvmErc20Balance
  }
}

export const EvmErc20Module: NewBalanceModule<
  ModuleType,
  EvmErc20Token | CustomEvmErc20Token,
  EvmErc20ChainMeta,
  EvmErc20ModuleConfig
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.evm
  assert(chainConnector, "This module requires an evm chain connector")

  return {
    ...DefaultBalanceModule("evm-erc20"),

    /**
     * This method is currently executed on [a squid](https://github.com/TalismanSociety/chaindata-squid/blob/0ee02818bf5caa7362e3f3664e55ef05ec8df078/src/steps/updateEvmNetworksFromGithub.ts#L280-L284).
     * In a future version of the balance libraries, we may build some kind of async scheduling system which will keep the chainmeta for each chain up to date without relying on a squid.
     */
    async fetchEvmChainMeta(chainId) {
      const isTestnet = (await chaindataProvider.getEvmNetwork(chainId))?.isTestnet || false

      return { isTestnet }
    },

    /**
     * This method is currently executed on [a squid](https://github.com/TalismanSociety/chaindata-squid/blob/0ee02818bf5caa7362e3f3664e55ef05ec8df078/src/steps/updateEvmNetworksFromGithub.ts#L338-L343).
     * In a future version of the balance libraries, we may build some kind of async scheduling system which will keep the list of tokens for each chain up to date without relying on a squid.
     */
    async fetchEvmChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet } = chainMeta

      const tokens: Record<string, EvmErc20Token> = {}
      for (const tokenConfig of moduleConfig?.tokens ?? []) {
        const { contractAddress, symbol: contractSymbol, decimals: contractDecimals } = tokenConfig
        // TODO : in chaindata's build, filter out all tokens that don't have any of these
        if (!contractAddress || !contractSymbol || contractDecimals === undefined) {
          log.warn("ignoring token on chain %s", chainId, tokenConfig)
          continue
        }

        const symbol = tokenConfig?.symbol ?? contractSymbol ?? "ETH"
        const decimals =
          typeof tokenConfig?.decimals === "number"
            ? tokenConfig.decimals
            : typeof contractDecimals === "number"
            ? contractDecimals
            : 18

        if (!symbol || typeof decimals !== "number") continue

        const id = evmErc20TokenId(chainId, contractAddress)
        const token: EvmErc20Token = {
          id,
          type: "evm-erc20",
          isTestnet,
          isDefault: tokenConfig.isDefault ?? true,
          symbol,
          decimals,
          logo: tokenConfig?.logo || githubTokenLogoUrl(id),
          contractAddress,
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

    getPlaceholderBalance(tokenId, address): EvmErc20Balance {
      const evmNetworkId = getEvmNetworkIdFromTokenId(tokenId)
      return {
        source: "evm-erc20",
        status: "initializing",
        address: address,
        multiChainId: { evmChainId: evmNetworkId },
        evmNetworkId,
        tokenId,
        free: "0",
      }
    },

    async subscribeBalances(addressesByToken, callback) {
      let subscriptionActive = true
      const subscriptionInterval = 6_000 // 6_000ms == 6 seconds
      const initDelay = 1_500 // 1_500ms == 1.5 seconds
      const cache = new Map<EvmNetworkId, BalanceJsonList>()

      // TODO remove this log
      log.debug("subscribeBalances", "evm-erc20", addressesByToken)

      // for chains with a zero balance we only call fetchBalances once every 5 subscriptionIntervals
      // if subscriptionInterval is 6 seconds, this means we only poll chains with a zero balance every 30 seconds
      let zeroBalanceSubscriptionIntervalCounter = 0

      const evmNetworks = await chaindataProvider.evmNetworks()
      const tokens = await chaindataProvider.tokens()

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

      // TODO remove this log
      log.debug("fetchBalances", "evm-erc20", addressesByToken)
      const evmNetworks = await chaindataProvider.evmNetworks()
      const tokens = await chaindataProvider.tokens()

      return fetchBalances(chainConnectors.evm, evmNetworks, tokens, addressesByToken)
    },
  }
}

const fetchBalances = async (
  evmChainConnector: ChainConnectorEvm,
  evmNetworks: EvmNetworkList,
  tokens: TokenList,
  addressesByToken: AddressesByToken<EvmErc20Token>
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
              if (token.type !== "evm-erc20") {
                log.debug(`This module doesn't handle tokens of type ${token.type}`)
                return tokensAndAddresses
              }

              const tokenAndAddresses: [EvmErc20Token | CustomEvmErc20Token, string[]] = [
                token,
                addresses,
              ]

              return [...tokensAndAddresses, tokenAndAddresses]
            },
            [] as Array<[EvmErc20Token | CustomEvmErc20Token, string[]]>
          )

          // fetch all balances
          const balanceRequests = tokensAndAddresses.flatMap(([token, addresses]) => {
            return addresses.map(
              async (address) =>
                new Balance({
                  source: "evm-erc20",

                  status: "live",

                  address: address,
                  multiChainId: { evmChainId: evmNetwork.id },
                  evmNetworkId,
                  tokenId: token.id,

                  free: await getFreeBalance(
                    publicClient,
                    token.contractAddress as `0x${string}`,
                    address as `0x${string}`
                  ),
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
  addressesByToken: AddressesByToken<EvmErc20Token>,
  tokens: TokenList
): Record<string, AddressesByToken<EvmErc20Token>> {
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
  }, {} as Record<string, AddressesByToken<EvmErc20Token>>)
}

async function getFreeBalance(
  publicClient: PublicClient,
  contractAddress: `0x${string}`,
  accountAddress: `0x${string}`
): Promise<string> {
  if (!isEthereumAddress(accountAddress)) return "0"

  try {
    const res = await publicClient.readContract({
      abi: erc20Abi,
      address: contractAddress,
      functionName: "balanceOf",
      args: [accountAddress],
    })

    return res.toString()
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
