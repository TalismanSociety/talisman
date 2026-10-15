import { SendFundsAccountPicker } from "@ui/domains/SendFunds/SendFundsAccountPicker"
import { useTranslation } from "react-i18next"

import { SendFundsLayout } from "./SendFundsLayout"

export const SendFundsFrom = () => {
  const { t } = useTranslation()
  return (
    <SendFundsLayout title={t("Send from")} withBackLink>
      <SendFundsAccountPicker />
    </SendFundsLayout>
  )
}
