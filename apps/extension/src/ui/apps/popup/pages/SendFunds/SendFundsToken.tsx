import { SendFundsTokenPicker } from "@ui/domains/SendFunds/SendFundsTokenPicker"
import { useTranslation } from "react-i18next"

import { SendFundsLayout } from "./SendFundsLayout"

export const SendFundsToken = () => {
  const { t } = useTranslation()
  return (
    <SendFundsLayout title={t("Select a token")}>
      <SendFundsTokenPicker />
    </SendFundsLayout>
  )
}
