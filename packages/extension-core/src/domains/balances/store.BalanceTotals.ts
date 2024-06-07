import { Address } from "@talismn/balances"
import { TokenRateCurrency } from "@talismn/token-rates"

import { StorageProvider } from "../../libs/Store"
import { BalanceTotal } from "./types"

export const balanceTotalsStore = new StorageProvider<
  Record<`${Address}:${TokenRateCurrency}`, BalanceTotal>
>("balanceTotals")
