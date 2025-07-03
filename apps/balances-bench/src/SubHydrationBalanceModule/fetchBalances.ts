import { IBalance } from "@talismn/balances"
import { AnyMiniMetadata } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { keyBy, uniq } from "lodash"

import { IBalanceModule } from "../IBalanceModule"
import { fetchRuntimeCallResult } from "./utils"

export const fetchBalances: IBalanceModule<"substrate-hydration">["fetchBalances"] = async ({
  networkId,
  addressesByToken,
  connector,
  miniMetadata,
}) => {
  const anyMiniMetadata = miniMetadata as AnyMiniMetadata
  if (!anyMiniMetadata?.data) {
    log.warn("MiniMetadata is required for fetching balances")
    return []
  }
  if (anyMiniMetadata.source !== "substrate-hydration") {
    log.warn(`Ignoring miniMetadata with source ${anyMiniMetadata.source} in substrate-hydration`)
    return []
  }
  if (anyMiniMetadata.chainId !== networkId) {
    log.warn(
      `Ignoring miniMetadata with chainId ${anyMiniMetadata.chainId} in substrate-hydration. Expected chainId is ${networkId}`,
    )
    return []
  }

  const tokens = addressesByToken.filter(([token]) => {
    if (token.type !== "substrate-hydration") {
      log.warn(`Ignoring token ${token.id} with type ${token.type} in substrate-hydration.`)
      return false
    }
    if (token.networkId !== networkId) {
      log.warn(
        `Ignoring token ${token.id} with networkId ${token.networkId} in substrate-hydration. Expected networkId is ${networkId}`,
      )
      return false
    }
    return true
  })

  const addresses = uniq(tokens.flatMap(([, addresses]) => addresses))

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

  return addressesByToken.reduce((acc, [token, addresses]) => {
    if (token.type === "substrate-hydration")
      for (const address of addresses) {
        const rawBalance = balancesByKey[`${address}:${token.onChainId}`]

        // the endpoint only returns entries for which the address has a non-zero balance
        // => generate an zero balance object if not found
        const balance: IBalance = {
          address,
          networkId,
          tokenId: token.id,
          source: "substrate-hydration",
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
}
