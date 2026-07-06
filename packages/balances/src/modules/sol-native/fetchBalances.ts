import { address as solAddress } from "@solana/kit"
import { isSolanaAddress } from "@talismn/crypto"

import type { IBalance } from "../../types"
import type { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { BalanceFetchError } from "../shared/errors"
import { getBalanceDefs } from "../shared/types"
import { MODULE_TYPE } from "./config"

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const rpc = await connector.getRpc(networkId)
  if (!rpc) throw new Error(`Could not get rpc provider for sol network ${networkId}`)

  for (const [token, addresses] of tokensWithAddresses) {
    if (token.type !== MODULE_TYPE || token.networkId !== networkId)
      throw new Error(
        `Invalid token type or networkId for balance module: ${token.type} on ${token.networkId}`
      )

    for (const address of addresses)
      if (!isSolanaAddress(address))
        throw new Error(
          `Invalid solana address for balance module: ${address} for token ${token.id}`
        )
  }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  const results = await Promise.allSettled(
    balanceDefs.map(async ({ token, address }): Promise<IBalance> => {
      try {
        const { value: lamports } = await rpc.getBalance(solAddress(address)).send()

        return {
          address: address,
          tokenId: token.id,
          value: lamports.toString(),
          source: MODULE_TYPE,
          networkId: token.networkId,
          status: "live",
        }
      } catch (err) {
        throw new BalanceFetchError(
          `Failed to get balance for token ${token.id} and address ${address} on chain ${networkId}`,
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
