import { AnalyticsPage } from "@ui/api/analytics"
import { SendFundsAmountForm } from "@ui/domains/SendFunds/SendFundsAmountForm"

import { SendFundsLayout } from "./SendFundsLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "Amount Form",
}

export const SendFundsAmount = () => {
  return (
    <SendFundsLayout title="Send" analytics={ANALYTICS_PAGE}>
      <SendFundsAmountForm />
    </SendFundsLayout>
  )
}
