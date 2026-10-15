import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import {
  TxHistoryList,
  TxHistoryProvider,
  TxHistoryToolbar,
} from "@ui/domains/Transactions/TxHistory"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { PopupContent, PopupLayout } from "../Layout/PopupLayout"

export const TxHistoryPage = () => {
  return (
    <PopupLayout>
      <TxHistoryProvider>
        <Header />
        <Suspense fallback={<SuspenseTracker name="TxHistoryPage" />}>
          <TxHistoryToolbar />
          <PopupContent withBottomNav className="px-8 text-body-secondary text-xs">
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
