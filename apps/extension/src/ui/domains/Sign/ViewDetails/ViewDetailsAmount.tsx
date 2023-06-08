import { BalanceFormatter } from "@core/domains/balances/types"
import { Token } from "@core/domains/tokens/types"
import { formatDecimals } from "@talismn/util"
import Fiat from "@ui/domains/Asset/Fiat"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { ViewDetailsField, ViewDetailsFieldProps } from "./ViewDetailsField"

type ViewDetailsAmountProps = ViewDetailsFieldProps & {
  amount: BalanceFormatter | undefined
  token: Token | undefined
}

export const ViewDetailsAmount: FC<ViewDetailsAmountProps> = ({ amount, token, ...fieldProps }) => {
  const { t } = useTranslation("sign")
  return (
    <ViewDetailsField {...fieldProps}>
      {amount?.tokens
        ? `${formatDecimals(amount?.tokens ?? 0, token?.decimals)} ${token?.symbol ?? ""}`
        : t("Unknown")}
      {amount?.fiat("usd") ? (
        <>
          {" / "}
          <Fiat noCountUp amount={amount.fiat("usd")} currency="usd" />
        </>
      ) : null}
    </ViewDetailsField>
  )
}
