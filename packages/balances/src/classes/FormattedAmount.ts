import type { AmountWithLabel } from "../types/balancetypes"
import type { BalanceFormatter } from "./formatters"

export type FormattedAmount<
  GenericAmount extends AmountWithLabel<TLabel>,
  TLabel extends string,
> = Omit<GenericAmount, "amount"> & {
  amount: BalanceFormatter
}
