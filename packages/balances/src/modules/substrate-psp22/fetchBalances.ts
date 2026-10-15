import type { IBalance } from "../../types"
import type { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import { BalanceFetchError } from "../shared"
import { getBalanceDefs } from "../shared/types"
import type { MODULE_TYPE } from "./config"
import { encodePsp22Message, makeContractCaller } from "./util"

const REVERT_FLAG = 1

const decodeU128 = (bytes: Uint8Array): bigint =>
  bytes.reduceRight((value, byte) => (value << 8n) | BigInt(byte), 0n)

/** ink! 3 returns a bare u128, ink! 4+ a `MessageResult<u128, LangError>` with a leading Ok/Err tag */
const decodeBalance = (data: Uint8Array): bigint => {
  if (data.length === 16) return decodeU128(data)
  if (data.length === 17 && data[0] === 0) return decodeU128(data.subarray(1))
  throw new Error("Unexpected balance_of return data")
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
      try {
        const result = await contractCall(
          address,
          token.contractAddress,
          encodePsp22Message.balanceOf(address)
        )

        if (!result.result.success) throw new Error("Contract call failed")
        if (result.result.value.flags & REVERT_FLAG) throw new Error("Contract call reverted")

        const balance: IBalance = {
          source: "substrate-psp22",
          status: "live",
          address,
          networkId: token.networkId,
          tokenId: token.id,
          value: decodeBalance(result.result.value.data).toString(),
        }

        return balance
      } catch (cause) {
        throw new BalanceFetchError(
          "Failed to fetch balance",
          token.id,
          address,
          cause instanceof Error ? cause : undefined
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
