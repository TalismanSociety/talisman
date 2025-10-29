import { Abi } from "@polkadot/api-contract"
import { TypeRegistry } from "@polkadot/types"

import { IBalance } from "../../types"
import { FetchBalanceResults, IBalanceModule } from "../../types/IBalanceModule"
import psp22Abi from "../abis/psp22.json"
import { BalanceFetchError } from "../shared"
import { getBalanceDefs } from "../shared/types"
import { MODULE_TYPE } from "./config"
import { makeContractCaller } from "./util"

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  if (!balanceDefs.length) return { success: [], errors: [] }

  const registry = new TypeRegistry()
  const Psp22Abi = new Abi(psp22Abi)

  const contractCall = makeContractCaller({
    chainConnector: connector,
    chainId: networkId,
    registry,
  })

  const results = await Promise.allSettled(
    balanceDefs.map(async ({ token, address }) => {
      const result = await contractCall(
        address,
        token.contractAddress,
        Psp22Abi.findMessage("PSP22::balance_of").toU8a([address]),
      )

      if (!result.result.isOk) throw new Error("Failed to fetch balance")

      const value = registry.createType("Balance", result.result.asOk.data).toString()

      const balance: IBalance = {
        source: "substrate-psp22",
        status: "live",
        address,
        networkId: token.networkId,
        tokenId: token.id,
        value,
      }

      return balance
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
