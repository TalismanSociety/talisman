import type { BalanceFormatter } from "@talismn/balances"
import type { Token } from "@talismn/chaindata-provider"
import { formatDecimals } from "@talismn/util"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useSelectedCurrency } from "@ui/state/settings"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { ViewDetailsField, type ViewDetailsFieldProps } from "./ViewDetailsField"

type ViewDetailsAmountProps = ViewDetailsFieldProps & {
  amount: BalanceFormatter | undefined
  token: Token | null
}

export const ViewDetailsAmount: FC<ViewDetailsAmountProps> = ({ amount, token, ...fieldProps }) => {
  const { t } = useTranslation()
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
