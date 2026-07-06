import type { IBalance } from "../../types"
import type { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import type { BalanceFetchError } from "../shared"
import { getBalanceDefs } from "../shared/types"
import type { MODULE_TYPE } from "./config"
import { encodePsp22Message, makeContractCaller } from "./util"

/**
 * Reads the first 16 bytes of the contract return data as a little-endian u128.
 *
 * Note: for contracts returning `MessageResult<u128, LangError>` the data starts with the
 * `Ok` tag byte - this replicates the legacy `registry.createType("Balance", data)` behavior.
 */
const decodeBalance = (data: Uint8Array): bigint => {
  const bytes = data.subarray(0, 16)
  let value = 0n
  for (let i = bytes.length - 1; i >= 0; i--) value = (value << 8n) | BigInt(bytes[i] as number)
  return value
}

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
        encodePsp22Message.balanceOf(address)
      )

      if (!result.result.success) throw new Error("Failed to fetch balance")

      const value = decodeBalance(result.result.value.data).toString()

      const balance: IBalance = {
        source: "substrate-psp22",
        status: "live",
        address,
        networkId: token.networkId,
        tokenId: token.id,
        value,
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
