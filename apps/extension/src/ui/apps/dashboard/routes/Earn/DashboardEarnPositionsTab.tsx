import { ExternalLinkIcon, ZapIcon } from "@talismn/icons"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { EarnPositionsList } from "@ui/domains/Earn/components/PositionsTab/EarnPositionsList"

const StakingTile = () => {
  const { t } = useTranslation()

  const handleStakingClick = () => {
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
  }

  return (
    <button
      type="button"
      className="bg-grey-850 hover:bg-grey-800 mb-4 flex h-[6.6rem] w-full cursor-pointer items-center justify-between rounded pl-8 pr-10 text-left transition-colors"
      onClick={handleStakingClick}
    >
      <div className="flex items-center gap-6">
        <ZapIcon className="h-8 w-8 text-white" />
        <div className="flex flex-col">
          <div className="text-base font-bold !text-white">{t("Staking")}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-body-secondary text-sm">{t("Self-stake through Talisman portal")}</div>
        <ExternalLinkIcon className="text-body-secondary h-8 w-8" />
      </div>
    </button>
  )
}

export const DashboardEarnPositionsTab: FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation()

  return (
    <div className="text-body-secondary min-w-[45rem] text-left text-base">
      {/* Staking Section */}
      <div className="mb-4">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Staking")}</h2>
        <StakingTile />
      </div>

      <EarnPositionsList search={search} />
    </div>
  )
}
