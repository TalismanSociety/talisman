import type { IBalance } from "../../types"
import type { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import type { BalanceFetchError } from "../shared"
import { getBalanceDefs } from "../shared/types"
import { encodePsp22Message } from "./codec"
import type { MODULE_TYPE } from "./config"
import { makeContractCaller } from "./util"

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  if (!balanceDefs.length) return { success: [], errors: [] }

  const contractCall = makeContractCaller({
    chainConnector: connector,
    chainId: networkId,
  })

  const results = await Promise.allSettled(
    balanceDefs.map(async ({ token, address }) => {
      const result = await contractCall(
        address,
        token.contractAddress,
        encodePsp22Message("PSP22::balance_of", [address])
      )

      if (!result.result.success) throw new Error("Failed to fetch balance")

      // Decode Balance (u128) from the contract result data
      // u128 is 16 bytes little-endian
      let value = 0n
      for (let i = 0; i < Math.min(16, result.result.data.length); i++)
        value |= BigInt(result.result.data[i]) << BigInt(i * 8)

      const balance: IBalance = {
        source: "substrate-psp22",
        status: "live",
        address,
        networkId: token.networkId,
        tokenId: token.id,
        value: value.toString(),
      }

      return balance
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
