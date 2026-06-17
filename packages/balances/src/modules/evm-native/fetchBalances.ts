import { parseTokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import type { PublicClient } from "viem"

import type { IBalance } from "../../types"
import type { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { BalanceFetchError } from "../shared/errors"
import { type BalanceDef, getBalanceDefs } from "../shared/types"
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
        `Invalid token type or networkId for EVM ERC20 balance module: ${token.type} on ${token.networkId}`
      )

    for (const address of addresses)
      if (!isEthereumAddress(address))
        throw new Error(
          `Invalid ethereum address for EVM ERC20 balance module: ${address} for token ${token.id}`
        )
  }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  return fetchNativeBalances(client, balanceDefs)
}

const fetchNativeBalances = async (
  client: PublicClient,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[]
): Promise<FetchBalanceResults> => {
  if (balanceDefs.length === 0) return { success: [], errors: [] }

  // Query `eth_getBalance` directly instead of `client.getBalance(...)`. Since viem 2.5x,
  // `getBalance` routes through `multicall3.getEthBalance` whenever the client has
  // `batch.multicall` enabled and the chain advertises a multicall3 contract. That breaks on
  // any chain where multicall3 is advertised (via viem's chain definitions) but not actually
  // deployed at the active RPC — e.g. a custom or forked RPC for a well-known chain id, or a
  // fresh dev node — where the call returns "0x" and viem throws "Cannot decode zero data".
  // A native balance never needs a contract; the raw request stays transport-batched.
  const results = await Promise.allSettled(
    balanceDefs.map(async ({ token, address }) => {
      try {
        const result = await client.request({
          method: "eth_getBalance",
          params: [address as `0x${string}`, "latest"],
        })

        const balance: IBalance = {
          address,
          tokenId: token.id,
          value: BigInt(result).toString(),
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
          err as Error
        )
      }
    })
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
    { success: [], errors: [] }
  )
}
