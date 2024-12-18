import { DbTokenRates, TokenRateCurrency, TokenRates } from "@talismn/token-rates"
import { Transaction as DbTransaction } from "dexie"
import { fromPairs, toPairs } from "lodash"

type OldDbTokenRates = {
  tokenId: string
  rates: Record<TokenRateCurrency, number>
}

// For DB version 10, Wallet version 2.3.0
export const upgradeTokenRatesToObjects = async (tx: DbTransaction) => {
  try {
    const oldTokenRates = await tx.table<OldDbTokenRates>("tokenRates").toArray()

    const newTokenRates = oldTokenRates.map(
      (oldTokenRate: OldDbTokenRates): DbTokenRates => ({
        tokenId: oldTokenRate.tokenId,
        rates: fromPairs(
          toPairs(oldTokenRate.rates).map(([currency, price]) => [currency, { price }]),
        ) as TokenRates,
      }),
    )

    await tx.table<DbTokenRates, string>("tokenRates").clear()
    await tx.table<DbTokenRates>("tokenRates").bulkPut(newTokenRates)
  } catch (err) {
    // non blocking, table rows will be replaced with fresh data when portfolio is displayed
  }
}
