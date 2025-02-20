import { BalanceFormatter } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { formatDecimals } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { useSelectedCurrency } from "@ui/state"

import { ViewDetailsField, ViewDetailsFieldProps } from "./ViewDetailsField"

type ViewDetailsAmountProps = ViewDetailsFieldProps & {
  amount: BalanceFormatter | undefined
  token: Token | null
}

export const ViewDetailsAmount: FC<ViewDetailsAmountProps> = ({ amount, token, ...fieldProps }) => {
  const { t } = useTranslation("request")
  const currency = useSelectedCurrency()
  return (
    <ViewDetailsField {...fieldProps}>
      {amount?.tokens
        ? `${formatDecimals(amount?.tokens ?? 0, token?.decimals)} ${token?.symbol ?? ""}`
        : t("Unknown")}
      {amount?.fiat(currency) ? (
        <>
          {" / "}
          <Fiat noCountUp amount={amount} />
        </>
      ) : null}
    </ViewDetailsField>
  )
}
