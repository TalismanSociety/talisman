import { FC } from "react"
import { useTranslation } from "react-i18next"

import { DiscoverOpportunities } from "@ui/domains/Earn/components/DiscoverTab/DiscoverOpportunities"
import { EarnOnYourAssets } from "@ui/domains/Earn/components/DiscoverTab/EarnOnYourAssets"

export const PopupEarnDiscoverTab: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Earn on your assets section */}
      <div className="mb-4">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Earn on your assets")}</h2>
        <EarnOnYourAssets isPopup={true} />
      </div>

      {/* Discover opportunities section */}
      <div className="mb-6">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">
          {t("Discover opportunities")}
        </h2>
        <DiscoverOpportunities isPopup={true} />
      </div>
    </div>
  )
}
