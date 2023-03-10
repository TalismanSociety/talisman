import { assert } from "@polkadot/util"
import {
  Address,
  AddressesByToken,
  Amount,
  Balance,
  Balances,
  DefaultBalanceModule,
  NewBalanceModule,
  NewBalanceType,
} from "@talismn/balances"
import {
  EvmChainId,
  EvmNetworkId,
  NewTokenType,
  TokenList,
  githubTokenLogoUrl,
} from "@talismn/chaindata-provider"
import { hasOwnProperty } from "@talismn/util"
import { ethers } from "ethers"
import isEqual from "lodash/isEqual"

import erc20Abi from "./erc20.json"
import log from "./log"

export { erc20Abi }

type ModuleType = "evm-erc20"

export const evmErc20TokenId = (
  chainId: EvmNetworkId,
  tokenContractAddress: EvmErc20Token["contractAddress"]
) => `${chainId}-evm-erc20-${tokenContractAddress}`.toLowerCase()

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
  tokens?: Array<{
    symbol?: string
    decimals?: number
    coingeckoId?: string
    contractAddress?: string
  }>
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

    async fetchEvmChainMeta(chainId) {
      const isTestnet = (await chaindataProvider.getEvmNetwork(chainId))?.isTestnet || false

      return { isTestnet }
    },

    async fetchEvmChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet } = chainMeta

      const tokens: Record<string, EvmErc20Token> = {}
      for (const tokenConfig of moduleConfig?.tokens || []) {
        const contractAddress = tokenConfig?.contractAddress
        if (!contractAddress) continue

        const [contractSymbol, contractDecimals] = await (async () => {
          const evmNetwork = await chaindataProvider.getEvmNetwork(chainId)
          if (!evmNetwork) return []

          const provider = await chainConnector.getProviderForEvmNetwork(evmNetwork)
          if (!provider) return []

          const contract = new ethers.Contract(contractAddress, erc20Abi, provider)

          try {
            return [await contract.symbol(), await contract.decimals()]
          } catch (error) {
            log.error(`Failed to retrieve contract symbol and decimals`, String(error))
            return []
          }
        })()

        const symbol = tokenConfig?.symbol || contractSymbol || "ETH"
        const decimals =
          typeof tokenConfig?.decimals === "number"
            ? tokenConfig.decimals
            : typeof contractDecimals === "number"
            ? contractDecimals
            : 18
        const coingeckoId =
          typeof tokenConfig?.coingeckoId === "string" ? tokenConfig.coingeckoId : undefined

        if (!symbol || typeof decimals !== "number") continue

        const id = evmErc20TokenId(chainId, contractAddress)
        const token: EvmErc20Token = {
          id,
          type: "evm-erc20",
          isTestnet,
          symbol,
          decimals,
          logo: githubTokenLogoUrl(id),
          coingeckoId,
          contractAddress,
          evmNetwork: { id: chainId },
        }

        tokens[token.id] = token
      }

      return tokens
    },

    async subscribeBalances(addressesByToken, callback) {
      let subscriptionActive = true
      const subscriptionInterval = 6_000 // 6_000ms == 6 seconds
      const cache = new Map<EvmNetworkId, unknown>()

      const poll = async () => {
        if (!subscriptionActive) return

        try {
          const tokens = await chaindataProvider.tokens()

          // regroup tokens by network
          const addressesByTokenByEvmNetwork = groupAddressesByTokenByEvmNetwork(
            addressesByToken,
            tokens
          )

          // fetch balance for each network sequentially to prevent creating a big queue of http requests (browser can only handle 2 at a time)
          for (const [evmNetworkId, addressesByToken] of Object.entries(
            addressesByTokenByEvmNetwork
          )) {
            try {
              const balances = await this.fetchBalances(addressesByToken)

              // Don't call callback with balances which have not changed since the last poll.
              const json = balances.toJSON()
              if (!isEqual(cache.get(evmNetworkId), json)) {
                cache.set(evmNetworkId, json)
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

      const addressesByTokenGroupedByEvmNetwork = groupAddressesByTokenByEvmNetwork(
        addressesByToken,
        tokens
      )

      const balances = (
        await Promise.allSettled(
          Object.entries(addressesByTokenGroupedByEvmNetwork).map(
            async ([evmNetworkId, addressesByToken]) => {
              if (!chainConnectors.evm)
                throw new Error(`This module requires an evm chain connector`)

              const evmNetwork = evmNetworks[evmNetworkId]
              if (!evmNetwork) throw new Error(`Evm network ${evmNetworkId} not found`)

              const provider = await chainConnectors.evm.getProviderForEvmNetwork(evmNetwork, {
                batch: true,
              })
              if (!provider)
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
                const contract = new ethers.Contract(token.contractAddress, erc20Abi, provider)

                return addresses.map(
                  async (address) =>
                    new Balance({
                      source: "evm-erc20",

                      status: "live",

                      address: address,
                      multiChainId: { evmChainId: evmNetwork.id },
                      evmNetworkId,
                      tokenId: token.id,

                      free: await getFreeBalance(contract, address),
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
    },
  }
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

async function getFreeBalance(contract: ethers.Contract, address: Address): Promise<string> {
  if (!isEthereumAddress(address)) return "0"

  try {
    return ((await contract.balanceOf(address)).toBigInt() || BigInt("0")).toString()
  } catch (error) {
    const errorMessage = hasOwnProperty(error, "message") ? error.message : error
    log.warn(
      `Failed to get balance from contract ${contract.address} for address ${address}: ${errorMessage}`
    )
    throw new Error(
      `Failed to get balance from contract ${contract.address} for address ${address}`,
      { cause: error as Error }
    )
  }
}

const isEthereumAddress = (address: string) => address.startsWith("0x") && address.length === 42
