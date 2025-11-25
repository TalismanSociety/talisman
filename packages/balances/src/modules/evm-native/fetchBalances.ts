import { parseTokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { PublicClient } from "viem"

import { IBalance } from "../../types"
import { FetchBalanceErrors, FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { abiMulticall } from "../abis"
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

  if (client.chain?.contracts?.multicall3 && balanceDefs.length > 1) {
    const multicall3 = client.chain.contracts.multicall3
    return fetchWithMulticall(client, balanceDefs, multicall3.address)
  }

  return fetchWithoutMulticall(client, balanceDefs)
}

const fetchWithoutMulticall = async (
  client: PublicClient,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[],
): Promise<FetchBalanceResults> => {
  if (balanceDefs.length === 0) return { success: [], errors: [] }

  const results = await Promise.allSettled(
    balanceDefs.map(async ({ token, address }) => {
      try {
        const result = await client.getBalance({ address })

        const balance: IBalance = {
          address,
          tokenId: token.id,
          value: result.toString(),
          source: MODULE_TYPE,
          networkId: parseTokenId(token.id).networkId,
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

const fetchWithMulticall = async (
  client: PublicClient,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[],
  multicall3Address: `0x${string}`,
): Promise<FetchBalanceResults> => {
  if (balanceDefs.length === 0) return { success: [], errors: [] }

  try {
    const callResults = await client.multicall({
      contracts: balanceDefs.map(({ address }) => ({
        address: multicall3Address,
        abi: abiMulticall,
        functionName: "getEthBalance",
        args: [address],
      })),
    })

    return callResults.reduce<FetchBalanceResults>(
      (acc, result, index) => {
        if (result.status === "success") {
          acc.success.push({
            address: balanceDefs[index].address,
            tokenId: balanceDefs[index].token.id,
            value: result.result.toString(),
            source: MODULE_TYPE,
            networkId: parseTokenId(balanceDefs[index].token.id).networkId,
            status: "live",
          } as IBalance)
        }
        if (result.status === "failure") {
          acc.errors.push({
            tokenId: balanceDefs[index].token.id,
            address: balanceDefs[index].address,
            error: new BalanceFetchError(
              `Failed to get balance for token ${balanceDefs[index].token.id} and address ${balanceDefs[index].address} on chain ${client.chain?.id}`,
              balanceDefs[index].token.id,
              balanceDefs[index].address,
              result.error,
            ),
          } as FetchBalanceErrors[number])
        }
        return acc
      },
      { success: [], errors: [] },
    )
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
