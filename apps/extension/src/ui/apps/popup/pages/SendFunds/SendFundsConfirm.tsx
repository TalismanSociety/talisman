import { SendFundsConfirmForm } from "@ui/domains/SendFunds/SendFundsConfirmForm"
import { useTranslation } from "react-i18next"

import { SendFundsLayout } from "./SendFundsLayout"

export const SendFundsConfirm = () => {
  const { t } = useTranslation()
  return (
    <SendFundsLayout withBackLink title={t("Confirm")}>
      <SendFundsConfirmForm />
    </SendFundsLayout>
  )
}
