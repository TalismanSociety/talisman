import { SendFundsRecipientPicker } from "@ui/domains/SendFunds/SendFundsRecipientPicker"
import { useTranslation } from "react-i18next"

import { SendFundsLayout } from "./SendFundsLayout"

export const SendFundsTo = () => {
  const { t } = useTranslation()
  return (
    <SendFundsLayout withBackLink title={t("Send to")}>
      <SendFundsRecipientPicker />
    </SendFundsLayout>
  )
}
