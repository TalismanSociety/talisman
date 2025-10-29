import { parseTokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import BigNumber from "bignumber.js"
import { keyBy, uniq } from "lodash-es"
import { getContract, PublicClient } from "viem"

import { ExtraAmount } from "../../types"
import { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { uniswapV2PairAbi } from "../abis"
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

  return fetchPoolBalances(client, balanceDefs)
}

const fetchPoolBalances = async (
  client: PublicClient,
  balanceDefs: BalanceDef<typeof MODULE_TYPE>[],
): Promise<FetchBalanceResults> => {
  if (balanceDefs.length === 0) return { success: [], errors: [] }

  // fetch pool specific info separately to prevent querying same contract info for multiple account addresses
  const pools = uniq(balanceDefs.map((def) => def.token.contractAddress))

  const [poolResults, balanceResults] = await Promise.all([
    // pool supplies and reserves
    Promise.allSettled(
      pools.map(async (address) => {
        const contract = getContract({ address, abi: uniswapV2PairAbi, client })

        const [totalSupply, [reserve0, reserve1]] = await Promise.all([
          contract.read.totalSupply(),
          contract.read.getReserves(),
        ])
        return { address, totalSupply, reserve0, reserve1 }
      }),
    ),
    // balances for each address
    Promise.allSettled(
      balanceDefs.map(async ({ token, address }) => {
        const balance = await client.readContract({
          address: token.contractAddress,
          abi: uniswapV2PairAbi,
          functionName: "balanceOf",
          args: [address],
        } as const)

        return { pool: token.contractAddress, address, balance }
      }),
    ),
  ])

  const poolInfo = keyBy(
    poolResults.filter((r) => r.status === "fulfilled").map((r) => r.value),
    (p) => p.address,
  )

  const results = balanceDefs.reduce<FetchBalanceResults>(
    (acc, { token, address }, i) => {
      const pool = poolInfo[token.contractAddress]
      if (!pool) {
        acc.errors.push({
          tokenId: token.id,
          address,
          error: new BalanceFetchNetworkError(
            `Pool data not found for token ${token.id} at address ${token.contractAddress}`,
            parseTokenId(token.id).networkId,
          ),
        })
        return acc
      }

      const balanceResult = balanceResults[i]

      if (balanceResult.status !== "fulfilled") {
        acc.errors.push({
          tokenId: token.id,
          address,
          error: new BalanceFetchError(
            `Failed to fetch balance for token ${token.id} at address ${address}`,
            token.id,
            address,
            balanceResult.reason as Error,
          ),
        })
        return acc
      }

      const { totalSupply, reserve0, reserve1 } = pool
      const { balance } = balanceResult.value

      const extraWithLabel = (label: string, amount: string): ExtraAmount<string> => ({
        type: "extra",
        label,
        amount,
      })

      const ratio = BigNumber(String(balance)).div(totalSupply === 0n ? "1" : String(totalSupply))

      acc.success.push({
        address,
        tokenId: token.id,
        source: MODULE_TYPE,
        networkId: parseTokenId(token.id).networkId,
        status: "live",
        values: [
          { type: "free", label: "free", amount: String(balance) },
          extraWithLabel("totalSupply", String(totalSupply)),
          extraWithLabel("reserve0", String(reserve0)),
          extraWithLabel("reserve1", String(reserve1)),
          extraWithLabel("holding0", ratio.times(String(reserve0)).toString(10)),
          extraWithLabel("holding1", ratio.times(String(reserve1)).toString(10)),
        ],
      })

      return acc
    },
    { success: [], errors: [] },
  )

  return results
}
