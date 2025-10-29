import { parseEvmErc20TokenId, parseTokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { ChainContract, erc20Abi, PublicClient } from "viem"

import { IBalance } from "../../types"
import { FetchBalanceErrors, FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { erc20BalancesAggregatorAbi } from "../abis"
import { BalanceFetchError, BalanceFetchNetworkError } from "../shared/errors"
import { BalanceDef, getBalanceDefs } from "../shared/types"
import { MODULE_TYPE } from "./config"

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const client = await connector.getPublicClientForEvmNetwork(networkId)
  if (!client) throw new Error(`Could not get rpc provider for evm network ${networkId}`)

  for (const [token, addresses] of tokensWithAddresses) {
    if (token.type !== MODULE_TYPE || token.networkId !== networkId)
      throw new Error(
        `Invalid token type or networkId for EVM ERC20 balance module: ${token.type} on ${token.networkId}`,
      )

    for (const address of addresses)
      if (!isEthereumAddress(address))
        throw new Error(
          `Invalid ethereum address for EVM ERC20 balance module: ${address} for token ${token.id}`,
        )
  }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  if (client.chain?.contracts?.erc20Aggregator && balanceDefs.length > 1) {
    const erc20Aggregator = client.chain.contracts.erc20Aggregator as ChainContract
    return fetchWithAggregator(client, balanceDefs, erc20Aggregator.address)
  }

  return fetchWithoutAggregator(client, balanceDefs)
}

const fetchWithoutAggregator = async (
  client: PublicClient,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[],
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
          source: MODULE_TYPE,
          networkId: parseEvmErc20TokenId(token.id).networkId,
          status: "live",
        }

        return balance
      } catch (err) {
        throw new BalanceFetchError(
          `Failed to get balance for token ${token.id} and address ${address} on chain ${client.chain?.id}`,
          token.id,
          address,
          err as Error,
        )
      }
    }),
  )

  return results.reduce<FetchBalanceResults>(
    (acc, result) => {
      if (result.status === "fulfilled") acc.success.push(result.value as IBalance)
      else {
        const error = result.reason as BalanceFetchError
        acc.errors.push({
          tokenId: error.tokenId,
          address: error.address,
          error,
        })
      }
      return acc
    },
    { success: [], errors: [] },
  )
}

const fetchWithAggregator = async (
  client: PublicClient,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[],
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
        source: MODULE_TYPE,
        networkId: parseTokenId(balanceDef.token.id).networkId,
        status: "live",
      }),
    )
    return { success, errors: [] }
  } catch (err) {
    const errors = balanceDefs.map((balanceDef): FetchBalanceErrors[number] => ({
      tokenId: balanceDef.token.id,
      address: balanceDef.address,
      error: new BalanceFetchNetworkError(
        `Failed to get balances for evm-erc20 tokens on chain ${client.chain?.id}`,
        String(client.chain?.id),
        err as Error,
      ),
    }))
    return { success: [], errors }
  }
}
