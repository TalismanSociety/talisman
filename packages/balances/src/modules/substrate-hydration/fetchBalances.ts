import { keyBy, uniq } from "lodash-es"

import log from "../../log"
import type { IBalance } from "../../types"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { fetchRuntimeCallResult } from "../shared"
import { getBalanceDefs } from "../shared/types"
import { MODULE_TYPE } from "./config"

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
  miniMetadata,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  if (!miniMetadata?.data) {
    log.warn(`MiniMetadata is required for fetching ${MODULE_TYPE} balances on ${networkId}.`, {
      tokensWithAddresses,
    })
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error("Minimetadata is required for fetching balances"),
      })),
    }
  }
  if (miniMetadata.source !== MODULE_TYPE) {
    log.warn(`Ignoring miniMetadata with source ${miniMetadata.source} in ${MODULE_TYPE}.`)
    return {
      success: [],
      errors: balanceDefs.map((def) => ({
        tokenId: def.token.id,
        address: def.address,
        error: new Error(`Invalid request: miniMetadata source is not ${MODULE_TYPE}`),
      })),
    }
  }
  if (miniMetadata.chainId !== networkId) {
    log.warn(
      `Ignoring miniMetadata with chainId ${miniMetadata.chainId} in ${MODULE_TYPE}. Expected chainId is ${networkId}`
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
        >(connector, networkId, miniMetadata.data!, "CurrenciesApi", "accounts", [address])
      )
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

    const success = tokensWithAddresses.reduce((acc, [token, addresses]) => {
      if (token.type === MODULE_TYPE)
        for (const address of addresses) {
          const rawBalance = balancesByKey[`${address}:${token.onChainId}`]

          // the endpoint only returns entries for which the address has a non-zero
          // balance. Do NOT fabricate zero-balance objects for the rest: with the full
          // token list that meant building (and fingerprinting) tokens×addresses
          // objects (1000+) on every 6s poll just for downstream to discard them — a
          // recurring JS-thread stall. Absent balances are already handled: the
          // provider's storage update deletes ids expected-but-missing from the result
          // set, so a position dropping to zero still disappears from the portfolio.
          if (!rawBalance) continue

          const balance: IBalance = {
            address,
            networkId,
            tokenId: token.id,
            source: MODULE_TYPE,
            status: "live",
            values: [
              {
                type: "free",
                label: "free",
                amount: rawBalance.free.toString(),
              },
              {
                type: "reserved",
                label: "reserved",
                amount: rawBalance.reserved.toString(),
              },
              {
                type: "locked",
                label: "frozen",
                amount: rawBalance.frozen.toString(),
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
