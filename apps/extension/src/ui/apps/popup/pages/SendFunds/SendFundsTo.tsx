import { AnalyticsPage } from "@ui/api/analytics"
import { SendFundsRecipientPicker } from "@ui/domains/SendFunds/SendFundsRecipientPicker"

import { SendFundsLayout } from "./SendFundsLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "To Account Picker",
}

export const SendFundsTo = () => {
  return (
    <SendFundsLayout withBackLink title="Send to" analytics={ANALYTICS_PAGE}>
      <SendFundsRecipientPicker />
    </SendFundsLayout>
  )
}
