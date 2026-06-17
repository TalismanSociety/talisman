import { parseTokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import type { PublicClient } from "viem"

import type { IBalance } from "../../types"
import type { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { abiMulticall } from "../abis"
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

  // Prefer a single multicall3.getEthBalance aggregate when the chain advertises a multicall3
  // contract and there's more than one balance to fetch. Fall back to direct eth_getBalance if
  // the multicall throws — which happens when multicall3 is advertised (via viem's chain
  // definitions) but not actually deployed at the active RPC: a custom or forked RPC for a
  // well-known chain id, or a fresh dev node, where `aggregate3` returns "0x".
  if (client.chain?.contracts?.multicall3 && balanceDefs.length > 1) {
    try {
      return await fetchWithMulticall(
        client,
        balanceDefs,
        client.chain.contracts.multicall3.address
      )
    } catch {
      // multicall3 unavailable at this RPC — fall through to direct balance queries
    }
  }

  return fetchWithGetBalance(client, balanceDefs)
}

// Query `eth_getBalance` directly (not `client.getBalance(...)`): since viem 2.5x, getBalance
// itself routes through multicall3.getEthBalance when the client has `batch.multicall` and the
// chain advertises multicall3 — re-triggering the very failure this fallback exists for. The
// raw request stays transport-batched (JSON-RPC array), so multiple addresses still coalesce.
const fetchWithGetBalance = async (
  client: PublicClient,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[]
): Promise<FetchBalanceResults> => {
  if (balanceDefs.length === 0) return { success: [], errors: [] }

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

// `allowFailure: false` so a missing multicall3 (an RPC without it deployed → `aggregate3`
// returns "0x") makes the whole call throw, letting the caller fall back to direct
// eth_getBalance. getEthBalance never reverts per-address, so we don't lose per-call resilience
// by disallowing failures.
const fetchWithMulticall = async (
  client: PublicClient,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[],
  multicall3Address: `0x${string}`
): Promise<FetchBalanceResults> => {
  if (balanceDefs.length === 0) return { success: [], errors: [] }

  const results = await client.multicall({
    allowFailure: false,
    contracts: balanceDefs.map(({ address }) => ({
      address: multicall3Address,
      abi: abiMulticall,
      functionName: "getEthBalance",
      args: [address],
    })),
  })

  return {
    success: results.map(
      (value, index): IBalance => ({
        address: balanceDefs[index].address,
        tokenId: balanceDefs[index].token.id,
        value: String(value),
        source: MODULE_TYPE,
        networkId: parseTokenId(balanceDefs[index].token.id).networkId,
        status: "live",
      })
    ),
    errors: [],
  }
}
