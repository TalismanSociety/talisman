import { EarnAvailableProducts } from "@ui/domains/Earn/components/EarnAvailableProducts"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const DashboardEarnDiscoverTab: FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation()

  return (
    <div className="min-w-[28.125rem] text-left text-base text-body-secondary">
      {/* Earn on your assets section */}
      <div className="mb-6">
        <h2 className="mb-4 font-medium text-body-secondary text-sm">{t("Earn on your assets")}</h2>
        <EarnAvailableProducts search={search} />
      </div>
    </div>
  )
}
