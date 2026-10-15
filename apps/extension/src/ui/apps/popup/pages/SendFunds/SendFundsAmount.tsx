import { SendFundsAmountForm } from "@ui/domains/SendFunds/SendFundsAmountForm"
import { useTranslation } from "react-i18next"

import { SendFundsLayout } from "./SendFundsLayout"

export const SendFundsAmount = () => {
  const { t } = useTranslation()
  return (
    <SendFundsLayout title={t("Send")}>
      <SendFundsAmountForm />
    </SendFundsLayout>
  )
}
