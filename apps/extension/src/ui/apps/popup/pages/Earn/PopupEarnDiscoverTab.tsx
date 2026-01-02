import { FC } from "react"
import { useTranslation } from "react-i18next"

import { EarnAvailableProducts } from "@ui/domains/Earn/components/EarnAvailableProducts"

export const PopupEarnDiscoverTab: FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Earn on your assets section */}
      <div className="mb-4">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Earn on your assets")}</h2>
        <EarnAvailableProducts search={search} />
      </div>
    </div>
  )
}
