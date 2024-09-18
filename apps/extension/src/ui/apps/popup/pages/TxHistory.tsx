import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { PopupContent, PopupLayout } from "../Layout/PopupLayout"

const Header = () => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 px-8 py-12">
      <div className="text-body text-lg font-bold">{t("Recent Activity")}</div>
      <div className="text-body-secondary text-xs">
        {t("Review the previous X transactions submitted by Talisman.")}
      </div>
    </div>
  )
}

export const TxHistoryPage = () => (
  <PopupLayout>
    <Header />
    <Suspense fallback={<div>Loading...</div>}>
      <PopupContent withBottomNav className="text-body-secondary text-xs"></PopupContent>
    </Suspense>
  </PopupLayout>
)
