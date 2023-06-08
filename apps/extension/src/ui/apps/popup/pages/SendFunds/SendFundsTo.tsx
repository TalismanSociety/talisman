import { AnalyticsPage } from "@ui/api/analytics"
import { SendFundsRecipientPicker } from "@ui/domains/SendFunds/SendFundsRecipientPicker"
import { useTranslation } from "react-i18next"

import { SendFundsLayout } from "./SendFundsLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Send Funds",
  featureVersion: 2,
  page: "To Account Picker",
}

export const SendFundsTo = () => {
  const { t } = useTranslation("send-funds")
  return (
    <SendFundsLayout withBackLink title={t("Send to")} analytics={ANALYTICS_PAGE}>
      <SendFundsRecipientPicker />
    </SendFundsLayout>
  )
}
