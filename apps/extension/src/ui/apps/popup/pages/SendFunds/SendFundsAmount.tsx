import { AnalyticsPage } from "@ui/api/analytics"
import { SendFundsAmountForm } from "@ui/domains/SendFunds/SendFundsAmountForm"
import { useTranslation } from "react-i18next"

import { SendFundsLayout } from "./SendFundsLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "Amount Form",
}

export const SendFundsAmount = () => {
  const { t } = useTranslation("send-funds")
  return (
    <SendFundsLayout title={t("Send")} analytics={ANALYTICS_PAGE}>
      <SendFundsAmountForm />
    </SendFundsLayout>
  )
}
