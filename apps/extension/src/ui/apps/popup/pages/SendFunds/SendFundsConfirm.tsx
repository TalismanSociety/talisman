import { AnalyticsPage } from "@ui/api/analytics"
import { SendFundsConfirmForm } from "@ui/domains/SendFunds/SendFundsConfirmForm"
import { useTranslation } from "react-i18next"

import { SendFundsLayout } from "./SendFundsLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "Confirm Form",
}

export const SendFundsConfirm = () => {
  const { t } = useTranslation("send-funds")
  return (
    <SendFundsLayout withBackLink title={t("Confirm")} analytics={ANALYTICS_PAGE}>
      <SendFundsConfirmForm />
    </SendFundsLayout>
  )
}
