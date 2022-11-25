import { BalanceFormatter } from "@core/domains/balances/types"
import { Token } from "@core/domains/tokens/types"
import Fiat from "@ui/domains/Asset/Fiat"
import { FC } from "react"
import { formatDecimals } from "talisman-utils"

import { ViewDetailsField, ViewDetailsFieldProps } from "./ViewDetailsField"

type ViewDetailsAmountProps = ViewDetailsFieldProps & {
  amount: BalanceFormatter | undefined
  token: Token | undefined
}

export const ViewDetailsAmount: FC<ViewDetailsAmountProps> = ({ amount, token, ...fieldProps }) => (
  <ViewDetailsField {...fieldProps}>
    {amount?.tokens
      ? `${formatDecimals(amount?.tokens ?? 0, token?.decimals)} ${token?.symbol ?? ""}`
      : "Unknown"}
    {amount?.fiat("usd") ? (
      <>
        {" / "}
        <Fiat noCountUp amount={amount.fiat("usd")} currency="usd" />
      </>
    ) : null}
  </ViewDetailsField>
)
