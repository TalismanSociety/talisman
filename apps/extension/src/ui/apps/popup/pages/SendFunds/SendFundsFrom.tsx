import { AnalyticsPage } from "@ui/api/analytics"
import { SendFundsAccountPicker } from "@ui/domains/SendFunds/SendFundsAccountPicker"
import { useTranslation } from "react-i18next"

import { SendFundsLayout } from "./SendFundsLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "From Account Picker",
}

export const SendFundsFrom = () => {
  const { t } = useTranslation("send-funds")
  return (
    <SendFundsLayout title={t("Send from")} withBackLink analytics={ANALYTICS_PAGE}>
      <SendFundsAccountPicker />
    </SendFundsLayout>
  )
}
