import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { EvmNativeToken, networkIdFromTokenId, TokenList } from "@talismn/chaindata-provider"
import { hasOwnProperty, isEthereumAddress } from "@talismn/util"
import { fromPairs, keys, toPairs } from "lodash"
import { hexToBigInt, isHex, PublicClient } from "viem"
import z from "zod/v4"

import {
  DefaultBalanceModule,
  DefaultChainMeta,
  DefaultModuleConfig,
  NewBalanceModule,
} from "../BalanceModule"
import log from "../log"
import { Address, AddressesByToken, Balances, NewBalanceType } from "../types"
import { TokenConfigBaseSchema } from "../types/tokens"
import { abiMulticall } from "./abis/multicall"

type ModuleType = "evm-native"
const moduleType: ModuleType = "evm-native"

export type EvmNativeChainMeta = DefaultChainMeta

export type EvmNativeModuleConfig = DefaultModuleConfig

export type EvmNativeBalance = NewBalanceType<ModuleType, "simple">

export const EvmNativeTokenConfigSchema = TokenConfigBaseSchema

export type EvmNativeTokenConfig = z.infer<typeof EvmNativeTokenConfigSchema>

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "evm-native": EvmNativeBalance
  }
}

export const EvmNativeModule: NewBalanceModule<
  ModuleType,
  EvmNativeToken,
  EvmNativeChainMeta,
  EvmNativeModuleConfig,
  EvmNativeTokenConfig
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate

  const getModuleTokens = async () => {
    return (await chaindataProvider.getTokensMapById(moduleType)) as Record<string, EvmNativeToken>
  }

  return {
    ...DefaultBalanceModule(moduleType),

    get tokens() {
      return chaindataProvider.getTokensMapById(moduleType) as Promise<
        Record<string, EvmNativeToken>
      >
    },

    /**
     * This method is currently executed on [a squid](https://github.com/TalismanSociety/chaindata-squid/blob/0ee02818bf5caa7362e3f3664e55ef05ec8df078/src/steps/updateEvmNetworksFromGithub.ts#L280-L284).
     * In a future version of the balance libraries, we may build some kind of async scheduling system which will keep the chainmeta for each chain up to date without relying on a squid.
     */
    async fetchEvmChainMeta(_chainId) {
      return { miniMetadata: null, extra: null }
    },

    /**
     * This method is currently executed on [a squid](https://github.com/TalismanSociety/chaindata-squid/blob/0ee02818bf5caa7362e3f3664e55ef05ec8df078/src/steps/updateEvmNetworksFromGithub.ts#L338-L343).
     * In a future version of the balance libraries, we may build some kind of async scheduling system which will keep the list of tokens for each chain up to date without relying on a squid.
     */
    async fetchEvmChainTokens() {
      // token is currently generated in chaindata from the EthNetworkConfig["nativeCurrency"] field
      return {}
    },

    async subscribeBalances({ addressesByToken, initialBalances }, callback) {
      let subscriptionActive = true
      const subscriptionInterval = 6_000 // 6_000ms == 6 seconds
      const initDelay = 500 // 500ms == 0.5 seconds

      const tokens = await getModuleTokens()
      const ethAddressesByToken = fromPairs(
        toPairs(addressesByToken)
          .map(([tokenId, addresses]) => {
            const ethAddresses = addresses.filter(isEthereumAddress)
            if (ethAddresses.length === 0) return null
            const token = tokens[tokenId]
            const evmNetworkId = token.networkId
            if (!evmNetworkId) return null
            return [tokenId, ethAddresses] as [string, Address[]]
          })
          .filter((x): x is [string, Address[]] => Boolean(x)),
      )

      // for chains with a zero balance we only call fetchBalances once every 5 subscriptionIntervals
      // if subscriptionInterval is 6 seconds, this means we only poll chains with a zero balance every 30 seconds
      let zeroBalanceSubscriptionIntervalCounter = 0

      // setup initialising balances for all active evm networks
      const activeEvmNetworkIds = keys(ethAddressesByToken).map(networkIdFromTokenId)
      const initialisingBalances = new Set<string>(activeEvmNetworkIds)
      const positiveBalanceNetworks = new Set<string>(
        (initialBalances as EvmNativeBalance[])?.map((b) => b.networkId),
      )

      const poll = async () => {
        if (!subscriptionActive) return

        zeroBalanceSubscriptionIntervalCounter = (zeroBalanceSubscriptionIntervalCounter + 1) % 5

        try {
          // fetch balance for each network sequentially to prevent creating a big queue of http requests (browser can only handle 2 at a time)
          for (const [tokenId, addresses] of Object.entries(ethAddressesByToken)) {
            const evmNetworkId = networkIdFromTokenId(tokenId)

            // a zero balance network is one that has initialised and does not have a positive balance
            const isZeroBalanceNetwork =
              !initialisingBalances.has(evmNetworkId) && !positiveBalanceNetworks.has(evmNetworkId)

            if (isZeroBalanceNetwork && zeroBalanceSubscriptionIntervalCounter !== 0) {
              // only poll empty token balances every 5 subscriptionIntervals
              continue
            }

            if (!tokenId) throw new Error(`No native token for evm network ${evmNetworkId}`)

            try {
              if (!chainConnectors.evm)
                throw new Error(`This module requires an evm chain connector`)
              const balances = await fetchBalances(
                chainConnectors.evm,
                { [tokenId]: addresses },
                tokens,
              )
              const resultBalances: EvmNativeBalance[] = []
              balances.flat().forEach((balance) => {
                if (balance instanceof EvmNativeBalanceError) {
                  log.error(balance.message, balance.networkId)
                  initialisingBalances.delete(balance.networkId)
                } else {
                  if (balance.networkId) {
                    initialisingBalances.delete(balance.networkId)
                    if (BigInt(balance.value) > 0n) {
                      positiveBalanceNetworks.add(balance.networkId)
                    }
                    resultBalances.push(balance)
                  }
                }
              })

              if (resultBalances.length > 0) {
                callback(null, {
                  status: initialisingBalances.size === 0 ? "live" : "initialising",
                  data: resultBalances,
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
      const tokens = await getModuleTokens()
      const balanceResults = await fetchBalances(chainConnectors.evm, addressesByToken, tokens)

      const pureBalances = balanceResults
        .flat()
        .filter(
          (b): b is EvmNativeBalance =>
            !(b instanceof EvmNativeBalanceError) && BigInt(b.value) > 0n,
        )

      return new Balances(pureBalances)
    },
  }
}

class EvmNativeBalanceError extends Error {
  networkId: string

  constructor(message: string, networkId: string, cause?: Error) {
    super(message)
    this.name = "EvmNativeBalanceError"
    this.networkId = networkId
    if (cause) {
      this.cause = cause
    }
  }
}

const fetchBalances = async (
  evmChainConnector: ChainConnectorEvm,
  addressesByToken: AddressesByToken<EvmNativeToken>,
  tokens: TokenList,
) => {
  if (!evmChainConnector) throw new Error(`This module requires an evm chain connector`)
  return Promise.all(
    Object.entries(addressesByToken).map(async ([tokenId, addresses]) => {
      const token = tokens[tokenId]
      const networkId = token.networkId
      if (!networkId) throw new Error(`Token ${token.id} has no evm network`)
      const publicClient = await evmChainConnector.getPublicClientForEvmNetwork(networkId)

      if (!publicClient) throw new Error(`Could not get rpc provider for evm network ${networkId}`)

      // fetch all balances
      const freeBalances = await getFreeBalances(publicClient, addresses)

      const balanceResults = addresses.map((address, i) => {
        if (freeBalances[i] === "error")
          return new EvmNativeBalanceError("Could not fetch balance ", networkId)

        return {
          source: "evm-native",
          status: "live",
          address: address,
          networkId,
          tokenId,
          value: freeBalances[i].toString(),
        } as EvmNativeBalance
      })

      return balanceResults
    }),
  )
}

async function getFreeBalance(
  publicClient: PublicClient,
  address: Address,
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
      `Failed to get balance from chain ${publicClient.chain?.id} for address ${address}: ${errorMessage}`,
    )
    return "error"
  }
}

async function getFreeBalances(
  publicClient: PublicClient,
  addresses: Address[],
): Promise<(bigint | "error")[]> {
  const ethAddresses = addresses.filter(isEthereumAddress)
  if (ethAddresses.length === 0) return []

  // if multicall is available, use it to save RPC rate limits
  if (publicClient.batch?.multicall && publicClient.chain?.contracts?.multicall3?.address) {
    try {
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
              `Failed to get balance from chain ${publicClient.chain?.id} for address ${address}: ${errorMessage}`,
            )
          }

          return [address, callResults[i].result ?? ("error" as const)]
        }),
      )

      return ethAddresses.map((address) => {
        const val = ethBalanceResults[address]
        if (isHex(val)) return hexToBigInt(val)
        return val ?? 0n
      })
    } catch (err) {
      const errorMessage = hasOwnProperty(err, "shortMessage")
        ? err.shortMessage
        : hasOwnProperty(err, "message")
          ? err.message
          : err
      log.warn(
        `Failed to get balance from chain ${publicClient.chain.id} for ${ethAddresses.length} addresses: ${errorMessage}`,
      )
      return ethAddresses.map(() => "error")
    }
  }

  return Promise.all(ethAddresses.map((address) => getFreeBalance(publicClient, address)))
}
