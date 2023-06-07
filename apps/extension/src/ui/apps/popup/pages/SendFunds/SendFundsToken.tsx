import { AnalyticsPage } from "@ui/api/analytics"
import { SendFundsTokenPicker } from "@ui/domains/SendFunds/SendFundsTokenPicker"
import { useTranslation } from "react-i18next"

import { SendFundsLayout } from "./SendFundsLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "Token Picker",
}

export const SendFundsToken = () => {
  const { t } = useTranslation("send-funds")
  return (
    <SendFundsLayout title={t("Select a token")} analytics={ANALYTICS_PAGE}>
      <SendFundsTokenPicker />
    </SendFundsLayout>
  )
}
