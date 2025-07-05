import { AnyMiniMetadata } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { keyBy, uniq } from "lodash"

import { IBalance } from "../../types"
import { IBalanceModule } from "../IBalanceModule"
import { fetchRuntimeCallResult } from "../shared"
import { getBalanceDefs } from "../shared/types"
import { MODULE_TYPE } from "./config"

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  addressesByToken,
  connector,
  miniMetadata,
}) => {
  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(addressesByToken)

  const anyMiniMetadata = miniMetadata as AnyMiniMetadata
  if (!anyMiniMetadata?.data) {
    log.warn("MiniMetadata is required for fetching balances")
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error("Minimetadata is required for fetching balances"),
      })),
    }
  }
  if (anyMiniMetadata.source !== MODULE_TYPE) {
    log.warn(`Ignoring miniMetadata with source ${anyMiniMetadata.source} in substrate-hydration`)
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error("Invalid request: miniMetadata source is not 'substrate-hydration'"),
      })),
    }
  }
  if (anyMiniMetadata.chainId !== networkId) {
    log.warn(
      `Ignoring miniMetadata with chainId ${anyMiniMetadata.chainId} in substrate-hydration. Expected chainId is ${networkId}`,
    )
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error(`Invalid request: Expected chainId is ${networkId}`),
      })),
    }
  }

  const addresses = uniq(balanceDefs.map((def) => def.address))

  try {
    const res = await Promise.all(
      addresses.map((address) =>
        fetchRuntimeCallResult<
          [onChainId: number, balance: { free: bigint; reserved: bigint; frozen: bigint }][]
        >(connector, networkId, anyMiniMetadata.data!, "CurrenciesApi", "accounts", [address]),
      ),
    )

    const fetchedBalances = addresses.flatMap((address, index) => {
      return res[index]
        .map(([onChainId, balance]) => ({
          address,
          onChainId,
          free: balance.free.toString(),
          reserved: balance.reserved.toString(),
          frozen: balance.frozen.toString(),
        }))
        .filter((b) => b.onChainId !== undefined)
    })

    const balancesByKey = keyBy(fetchedBalances, (b) => `${b.address}:${b.onChainId}`)

    const success = addressesByToken.reduce((acc, [token, addresses]) => {
      if (token.type === MODULE_TYPE)
        for (const address of addresses) {
          const rawBalance = balancesByKey[`${address}:${token.onChainId}`]

          // the endpoint only returns entries for which the address has a non-zero balance
          // => generate an zero balance object if not found
          const balance: IBalance = {
            address,
            networkId,
            tokenId: token.id,
            source: MODULE_TYPE,
            status: "cache",
            values: [
              {
                type: "free",
                label: "free",
                amount: rawBalance?.free.toString() ?? "0",
              },
              {
                type: "reserved",
                label: "reserved",
                amount: rawBalance?.reserved.toString() ?? "0",
              },
              {
                type: "locked",
                label: "frozen",
                amount: rawBalance?.frozen.toString() ?? "0",
              },
            ],
          }

          acc.push(balance)
        }

      return acc
    }, [] as IBalance[])

    return {
      success,
      errors: [],
    }
  } catch (err) {
    log.warn("Failed to fetch balances for substrate-hydration", err)

    const errors = balanceDefs.map((def) => ({
      tokenId: def.token.id,
      address: def.address,
      error: new Error(`Failed to fetch balance for ${def.address} on ${networkId}`),
    }))

    return {
      success: [],
      errors,
    }
  }
}
