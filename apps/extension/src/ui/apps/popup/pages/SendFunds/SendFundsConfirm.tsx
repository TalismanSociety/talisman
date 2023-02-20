import { AnalyticsPage } from "@ui/api/analytics"
import { SendFundsConfirmForm } from "@ui/domains/SendFunds/SendFundsConfirmForm"

import { SendFundsLayout } from "./SendFundsLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "Confirm Form",
}

export const SendFundsConfirm = () => {
  return (
    <SendFundsLayout withBackLink title="Confirm" analytics={ANALYTICS_PAGE}>
      <SendFundsConfirmForm />
    </SendFundsLayout>
  )
}
