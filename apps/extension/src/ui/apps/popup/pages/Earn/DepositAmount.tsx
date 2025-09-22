import { useTranslation } from "react-i18next"

import { AnalyticsPage } from "@ui/api/analytics"
import { DepositAmountForm } from "@ui/domains/Staking/Earn/components/DepositAmountForm"

import { EarnLayout } from "./EarnLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Earn Yield",
  featureVersion: 1,
  page: "Deposit Amount Form",
}

export const DepositAmount = () => {
  const { t } = useTranslation()
  return (
    <EarnLayout title={t("Deposit")} analytics={ANALYTICS_PAGE}>
      <DepositAmountForm />
    </EarnLayout>
  )
}
