import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import type { AnalyticsPage } from "@ui/api/analytics"
import {
  TxHistoryList,
  TxHistoryProvider,
  TxHistoryToolbar,
} from "@ui/domains/Transactions/TxHistory"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { PopupContent, PopupLayout } from "../Layout/PopupLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Transactions",
  featureVersion: 1,
  page: "Recent history drawer",
}

export const TxHistoryPage = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <PopupLayout>
      <TxHistoryProvider>
        <Header />
        <Suspense fallback={<SuspenseTracker name="TxHistoryPage" />}>
          <TxHistoryToolbar />
          <PopupContent withBottomNav className="text-body-secondary text-xs">
            <TxHistoryList />
          </PopupContent>
        </Suspense>
      </TxHistoryProvider>
    </PopupLayout>
  )
}

const Header = () => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 px-8 py-12">
      <div className="font-bold text-body text-lg">{t("Recent Activity")}</div>
      <div className="text-body-secondary text-xs">
        {t("Review the latest transactions submitted by Talisman.")}
      </div>
    </div>
  )
}
