import { EvmErc20Token, parseEvmErc20TokenId, TokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"
import { isHexString } from "extension-shared"
import { ChainContract, erc20Abi, PublicClient } from "viem"

import { Address, IBalance } from "../../types"
import { erc20BalancesAggregatorAbi } from "../EvmErc20Module"
import { FetchBalanceErrors, FetchBalanceResults, IBalanceModule } from "../IBalanceModule"

export const fetchBalances: IBalanceModule<"evm-erc20">["fetchBalances"] = async ({
  networkId,
  addressesByToken,
  connector,
}) => {
  const client = await connector.getPublicClientForEvmNetwork(networkId)
  if (!client) throw new Error(`Could not get rpc provider for evm network ${networkId}`)

  for (const [token, addresses] of addressesByToken) {
    if (token.type !== "evm-erc20" || token.networkId !== networkId)
      throw new Error(
        `Invalid token type or networkId for EVM ERC20 balance module: ${token.type} on ${token.networkId}`,
      )

    for (const address of addresses)
      if (!isEthereumAddress(address))
        throw new Error(
          `Invalid ethereum address for EVM ERC20 balance module: ${address} for token ${token.id}`,
        )
  }

  const balanceDefs: BalanceDef[] = addressesByToken.flatMap(([token, addresses]) =>
    addresses.filter(isHexString).map((address) => ({
      token: token as EvmErc20Token,
      address,
    })),
  )

  if (client.chain?.contracts?.erc20Aggregator) {
    const erc20Aggregator = client.chain.contracts.erc20Aggregator as ChainContract
    return fetchWithAggregator(client, balanceDefs, erc20Aggregator.address)
  }

  return fetchWithoutAggregator(client, balanceDefs)
}

type BalanceDef = { token: EvmErc20Token; address: `0x${string}` }

class EvmErc20BalanceError extends Error {
  tokenId: TokenId
  address: Address

  constructor(message: string, tokenId: TokenId, address: Address, cause?: Error) {
    super(message)
    this.name = "EvmErc20BalanceError"
    this.tokenId = tokenId
    this.address = address
    if (cause) this.cause = cause
  }
}
class EvmErc20NetworkError extends Error {
  evmNetworkId: string | undefined

  constructor(message: string, evmNetworkId?: string, cause?: Error) {
    super(message)
    this.name = "EvmErc20NetworkError"
    this.evmNetworkId = evmNetworkId
    if (cause) this.cause = cause
  }
}

const fetchWithoutAggregator = async (
  client: PublicClient,
  balanceDefs: BalanceDef[],
): Promise<FetchBalanceResults> => {
  if (balanceDefs.length === 0) return { success: [], errors: [] }

  const results = await Promise.allSettled(
    balanceDefs.map(async ({ token, address }) => {
      try {
        const result = await client.readContract({
          abi: erc20Abi,
          address: token.contractAddress,
          functionName: "balanceOf",
          args: [address],
        })

        const balance: IBalance = {
          address,
          tokenId: token.id,
          value: result.toString(),
          source: "evm-erc20",
          networkId: parseEvmErc20TokenId(token.id).networkId,
          status: "cache",
        }

        return balance
      } catch (err) {
        throw new EvmErc20BalanceError(
          `Failed to get balance for token ${token.id} and address ${address} on chain ${client.chain?.id}`,
          token.id,
          address,
          err as Error,
        )
      }
    }),
  )

  return results.reduce(
    (acc, result) => {
      if (result.status === "fulfilled") acc.success.push(result.value as IBalance)
      else {
        const error = result.reason as EvmErc20BalanceError
        acc.errors.push({
          tokenId: error.tokenId,
          address: error.address,
          error,
        })
      }
      return acc
    },
    { success: [], errors: [] } as FetchBalanceResults,
  )
}

const fetchWithAggregator = async (
  client: PublicClient,
  balanceDefs: BalanceDef[],
  erc20BalancesAggregatorAddress: `0x${string}`,
): Promise<FetchBalanceResults> => {
  if (balanceDefs.length === 0) return { success: [], errors: [] }

  try {
    const erc20Balances = await client.readContract({
      abi: erc20BalancesAggregatorAbi,
      address: erc20BalancesAggregatorAddress,
      functionName: "balances",
      args: [
        balanceDefs.map((b) => ({
          account: b.address,
          token: b.token.contractAddress,
        })),
      ],
    })

    const success = balanceDefs.map(
      (balanceDef, index): IBalance => ({
        address: balanceDef.address,
        tokenId: balanceDef.token.id,
        value: erc20Balances[index].toString(),
        source: "evm-erc20",
        networkId: parseEvmErc20TokenId(balanceDef.token.id).networkId,
        status: "cache",
      }),
    )
    return { success, errors: [] }
  } catch (err) {
    const errors = balanceDefs.map((balanceDef): FetchBalanceErrors[number] => ({
      tokenId: balanceDef.token.id,
      address: balanceDef.address,
      error: new EvmErc20NetworkError(
        `Failed to get balances for evm-erc20 tokens on chain ${client.chain?.id}`,
        String(client.chain?.id),
        err as Error,
      ),
    }))
    return { success: [], errors }
  }
}
