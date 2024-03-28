import { assert } from "@polkadot/util"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import {
  BalancesConfigTokenParams,
  EvmChainId,
  EvmNetworkId,
  NewTokenType,
  TokenList,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { hasOwnProperty, isEthereumAddress } from "@talismn/util"
import { PublicClient } from "viem"

import { DefaultBalanceModule, NewBalanceModule } from "../BalanceModule"
import log from "../log"
import { AddressesByToken, Amount, Balances, NewBalanceType } from "../types"
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
type EvmErc20NetworkParams = Record<
  EvmNetworkId,
  Array<{
    token: EvmErc20Token
    address: string
  }>
>

export const EvmErc20Module: NewBalanceModule<
  ModuleType,
  EvmErc20Token | CustomEvmErc20Token,
  EvmErc20ChainMeta,
  EvmErc20ModuleConfig
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.evm
  assert(chainConnector, "This module requires an evm chain connector")

  const prepareFetchParameters = async (
    addressesByToken: AddressesByToken<EvmErc20Token>
  ): Promise<EvmErc20NetworkParams> => {
    const tokens = await chaindataProvider.tokensById()

    const addressesByTokenByEvmNetwork = groupAddressesByTokenByEvmNetwork(addressesByToken, tokens)
    return Object.entries(addressesByTokenByEvmNetwork).reduce(
      (result, [evmNetworkId, addressesByToken]) => {
        const networkParams = Object.entries(addressesByToken).flatMap(([tokenId, addresses]) => {
          const token = tokens[tokenId]
          // TODO: Fix @talismn/balances-react: it shouldn't pass every token to every module
          if (token.type !== "evm-erc20") {
            log.debug(`This module doesn't handle tokens of type ${token.type}`)
            return []
          }

          return addresses.map((address) => ({
            token,
            address,
            evmNetworkId,
          }))
        })
        result[evmNetworkId] = networkParams
        return result
      },
      {} as EvmErc20NetworkParams
    )
  }

  return {
    ...DefaultBalanceModule("evm-erc20"),

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
      const initialisingBalances = new Set<string>()
      const positiveBalanceNetworks = new Set<string>()
      const tokens = await chaindataProvider.tokensById()

      // for chains with a zero balance we only call fetchBalances once every 5 subscriptionIntervals
      // if subscriptionInterval is 6 seconds, this means we only poll chains with a zero balance every 30 seconds
      let zeroBalanceSubscriptionIntervalCounter = 0

      const evmNetworks = await chaindataProvider.evmNetworksById()

      const fetchesPerNetwork = await prepareFetchParameters(addressesByToken)

      Object.entries(fetchesPerNetwork).forEach(([evmNetworkId, fetches]) => {
        fetches.forEach(({ address, token }) => {
          initialisingBalances.add(getErc20BalanceId({ address, token, evmNetworkId }))
        })
      })

      const poll = async () => {
        if (!subscriptionActive) return

        zeroBalanceSubscriptionIntervalCounter = (zeroBalanceSubscriptionIntervalCounter + 1) % 5

        try {
          // fetch balance for each network sequentially to prevent creating a big queue of http requests (browser can only handle 2 at a time)
          for (const evmNetworkId of Object.keys(fetchesPerNetwork)) {
            const initialisingNetworkBalances = Array.from(initialisingBalances).filter((id) =>
              id.startsWith(`${evmNetworkId}-`)
            )
            const isZeroBalanceNetwork =
              initialisingNetworkBalances.length === 0 && !positiveBalanceNetworks.has(evmNetworkId)

            if (isZeroBalanceNetwork && zeroBalanceSubscriptionIntervalCounter !== 0) {
              // only poll empty token balances every 5 subscriptionIntervals
              continue
            }

            try {
              if (!chainConnectors.evm)
                throw new Error(`This module requires an evm chain connector`)

              // validate that the network is real
              const evmNetwork = evmNetworks[evmNetworkId]
              if (!evmNetwork) throw new Error(`Evm network ${evmNetworkId} not found`)

              const { errors, results } = await fetchBalances(
                chainConnectors.evm,
                fetchesPerNetwork
              )
              // handle errors first
              errors.forEach((error) => {
                if (error instanceof EvmErc20BalanceError) {
                  log.error(
                    `Error fetching balance for token ${error.balanceId} on chain ${evmNetworkId}`,
                    error
                  )
                  initialisingBalances.delete(error.balanceId)
                } else if (error instanceof EvmErc20NetworkError) {
                  log.error(`Error fetching balance for chain ${error.evmNetworkId}`, error)
                }
              })

              const positiveBalances = results
                .map((balance) => {
                  // update initialising balance state
                  const token = tokens[balance.tokenId] as EvmErc20Token
                  const balanceId = getErc20BalanceId({
                    address: balance.address,
                    token,
                    evmNetworkId,
                  })
                  if (initialisingBalances.has(balanceId)) {
                    initialisingBalances.delete(balanceId)
                  }
                  return balance
                })
                .filter((balance) => {
                  // remove zero balances from the list of positive balances,
                  // and record that this network has a positive balance so we poll more often
                  if (BigInt(balance.free) > 0n) {
                    positiveBalanceNetworks.add(evmNetworkId)
                    return balance
                  }
                  return false
                })

              if (positiveBalances.length > 0) {
                callback(null, {
                  status: initialisingBalances.size > 0 ? "initialising" : "live",
                  data: positiveBalances,
                })
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

      const fetchesPerNetwork = await prepareFetchParameters(addressesByToken)
      const balances = await fetchBalances(chainConnectors.evm, fetchesPerNetwork)
      return new Balances(balances.results)
    },
  }
}

class EvmErc20BalanceError extends Error {
  balanceId: string

  constructor(message: string, balanceId: string, cause?: Error) {
    super(message)
    this.name = "EvmErc20BalanceError"
    this.balanceId = balanceId
    if (cause) {
      this.cause = cause
    }
  }
}
class EvmErc20NetworkError extends Error {
  evmNetworkId: string | undefined

  constructor(message: string, evmNetworkId?: string) {
    super(message)
    this.name = "EvmErc20NetworkError"
    this.evmNetworkId = evmNetworkId
  }
}

type EvmErc20TokenBalanceResponse = {
  results: EvmErc20Balance[]
  errors: Array<EvmErc20BalanceError | EvmErc20NetworkError>
}

const fetchBalances = async (
  evmChainConnector: ChainConnectorEvm,
  tokenAddressesByNetwork: EvmErc20NetworkParams
): Promise<EvmErc20TokenBalanceResponse> => {
  const result = {
    results: [] as EvmErc20Balance[],
    errors: [] as Array<EvmErc20BalanceError | EvmErc20NetworkError>,
  }
  await Promise.all(
    Object.entries(tokenAddressesByNetwork).map(async ([evmNetworkId, networkParams]) => {
      const publicClient = await evmChainConnector.getPublicClientForEvmNetwork(evmNetworkId)
      if (!publicClient)
        throw new EvmErc20NetworkError(
          `Could not get rpc provider for evm network ${evmNetworkId}`,
          evmNetworkId
        )

      // fetch all balances for this network
      return await Promise.all(
        networkParams.map(
          async ({ token, address }) =>
            await getFreeBalance(
              publicClient,
              token.contractAddress as `0x${string}`,
              address as `0x${string}`
            )
              .then((free) =>
                result.results.push({
                  source: "evm-erc20",
                  status: "live",
                  address: address,
                  multiChainId: { evmChainId: evmNetworkId },
                  evmNetworkId,
                  tokenId: token.id,
                  free,
                } as EvmErc20Balance)
              )
              .catch((error) => {
                const balanceId = getErc20BalanceId({ token, address, evmNetworkId })
                result.errors.push(
                  new EvmErc20BalanceError(
                    `Failed to get balance for token ${token.id} and address ${address} on chain ${evmNetworkId}`,
                    balanceId,
                    error
                  )
                )
              })
        )
      )
    })
  )

  return result
}

/**
 * getErc20BalanceId
 * @description: Special function to generate a unique id for each EvmErc20 balance, intended for internal use only to maintain 'initialised' state
 * @param param0: { address, token, evmNetworkId }
 * @returns
 */
const getErc20BalanceId = ({
  address,
  token,
  evmNetworkId,
}: {
  token: EvmErc20Token
  address: string
  evmNetworkId: EvmNetworkId
}) => `${evmNetworkId}-${address}-${token.contractAddress}`

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
