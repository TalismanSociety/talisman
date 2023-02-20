import { AnalyticsPage } from "@ui/api/analytics"
import { SendFundsMainForm } from "@ui/domains/SendFunds/SendFundsMainForm"

import { SendFundsLayout } from "./SendFundsLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "Amount Form",
}

export const SendFundsAmount = () => {
  return (
    <SendFundsLayout withBackLink title="Send" analytics={ANALYTICS_PAGE}>
      <SendFundsMainForm />
    </SendFundsLayout>
  )
}
