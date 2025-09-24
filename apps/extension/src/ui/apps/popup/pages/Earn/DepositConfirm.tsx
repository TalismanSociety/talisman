import { useTranslation } from "react-i18next"

import { AnalyticsPage } from "@ui/api/analytics"
import { DepositConfirmForm } from "@ui/domains/Earn/components/DepositConfirmForm"

import { EarnLayout } from "./EarnLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Earn Yield",
  featureVersion: 1,
  page: "Deposit Confirm Form",
}

export const DepositConfirm = () => {
  const { t } = useTranslation()
  return (
    <EarnLayout title={t("Confirm Deposit")} withBackLink analytics={ANALYTICS_PAGE}>
      <DepositConfirmForm />
    </EarnLayout>
  )
}
