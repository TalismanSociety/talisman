import { BalanceFormatter } from "@core/domains/balances/types"
import { Token } from "@core/domains/tokens/types"
import { formatDecimals } from "@talismn/util"
import Fiat from "@ui/domains/Asset/Fiat"
import { FC } from "react"

import { ViewDetailsField, ViewDetailsFieldProps } from "./ViewDetailsField"

type ViewDetailsAmountProps = ViewDetailsFieldProps & {
  amount: BalanceFormatter | undefined
  token: Token | undefined
}

export const ViewDetailsAmount: FC<ViewDetailsAmountProps> = ({ amount, token, ...fieldProps }) => (
  <ViewDetailsField {...fieldProps}>
    {`${formatDecimals(amount?.tokens ?? 0, token?.decimals)} ${token?.symbol}`}
    {amount?.fiat("usd") !== null && (
      <>
        {" / "}
        <Fiat noCountUp amount={amount?.fiat("usd")} currency="usd" />
      </>
    )}
  </ViewDetailsField>
)
