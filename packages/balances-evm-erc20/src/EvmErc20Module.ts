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

import erc20Abi from "./erc20.json"
import log from "./log"

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

export const EvmErc20Module: BalanceModule<
  ModuleType,
  EvmErc20Token | CustomEvmErc20Token,
  EvmErc20ChainMeta,
  EvmErc20ModuleConfig
> = {
  ...DefaultBalanceModule("evm-erc20"),

  async fetchEvmChainMeta(chainConnector, chaindataProvider, chainId) {
    const isTestnet = (await chaindataProvider.getEvmNetwork(chainId))?.isTestnet || false

    return { isTestnet }
  },

  async fetchEvmChainTokens(chainConnector, chaindataProvider, chainId, chainMeta, moduleConfig) {
    const { isTestnet } = chainMeta

    const tokens: Record<string, EvmErc20Token> = {}
    for (const tokenConfig of moduleConfig?.tokens || []) {
      // TODO: Use imported erc20 abi to fetch `symbol` and `decimals` from the evm network rpc
      const symbol = tokenConfig?.symbol || "ETH"
      const decimals = typeof tokenConfig?.decimals === "number" ? tokenConfig.decimals : 18
      const contractAddress = tokenConfig?.contractAddress

      if (!symbol || typeof decimals !== "number" || !contractAddress) continue

      const id = evmErc20TokenId(chainId, contractAddress)
      const token: EvmErc20Token = {
        id,
        type: "evm-erc20",
        isTestnet,
        symbol,
        decimals,
        logo: `https://raw.githubusercontent.com/TalismanSociety/chaindata/v3/assets-tokens/${id}.svg`,
        contractAddress,
        evmNetwork: { id: chainId },
      }

      tokens[token.id] = token
    }

    return tokens
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

    chainConnectors.evm?.getProviderForEvmNetwork

    const addressesByTokenGroupedByEvmNetwork = groupAddressesByTokenByEvmNetwork(
      addressesByToken,
      tokens
    )

    const balances = await Promise.all(
      Object.entries(addressesByTokenGroupedByEvmNetwork).map(
        async ([evmNetworkId, addressesByToken]) => {
          if (!chainConnectors.evm) throw new Error(`This module requires an evm chain connector`)

          const evmNetwork = evmNetworks[evmNetworkId]
          if (!evmNetwork) throw new Error(`Evm network ${evmNetworkId} not found`)

          const provider = chainConnectors.evm.getProviderForEvmNetwork(evmNetwork, {
            batch: true,
          })
          if (!provider)
            throw new Error(`Could not get rpc provider for evm network ${evmNetworkId}`)

          const tokensAndAddresses = Object.entries(addressesByToken).reduce(
            (tokensAndAddresses, [tokenId, addresses]) => {
              const token = tokens[tokenId]
              if (!token) throw new Error(`Token ${tokenId} not found`)

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
                log.error(result.reason)
                return null
              }

              return result.value
            })
            .filter((balance): balance is Balance => balance !== null)

          // return to caller
          return new Balances(balances)
        }
      )
    )

    return balances.reduce((allBalances, balances) => allBalances.add(balances), new Balances([]))
  },
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
  return ((await contract.balanceOf(address)).toBigInt() || BigInt("0")).toString()
}
