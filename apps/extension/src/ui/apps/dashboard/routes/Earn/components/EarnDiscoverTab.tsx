import { FC } from "react"
import { useTranslation } from "react-i18next"

// import { DiscoverOpportunities } from "@ui/domains/Earn/components/DiscoverTab/DiscoverOpportunities"
import { EarnAvailableProducts } from "@ui/domains/Earn/components/DiscoverTab/EarnAvailableProducts"

export const EarnDiscoverTab: FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation()

  return (
    <div className="text-body-secondary min-w-[45rem] text-left text-base">
      {/* Earn on your assets section */}
      <div className="mb-6">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Earn on your assets")}</h2>
        <EarnAvailableProducts search={search} />
      </div>

      {/* Discover opportunities section */}
      {/* <div className="mb-6">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">
          {t("Discover opportunities")}
        </h2>
        <DiscoverOpportunities search={search} isPopup={false} />
      </div> */}
    </div>
  )
}
