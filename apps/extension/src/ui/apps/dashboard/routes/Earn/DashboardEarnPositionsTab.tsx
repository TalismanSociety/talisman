import { TALISMAN_WEB_APP_STAKING_URL } from "@common/constants"
import { ExternalLinkIcon, ZapIcon } from "@talismn/icons"
import { EarnPositionsList } from "@ui/domains/Earn/components/EarnPositionsList"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

const StakingTile = () => {
  const { t } = useTranslation()

  const handleStakingClick = () => {
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
  }

  return (
    <button
      type="button"
      className="mb-4 flex h-[4.125rem] w-full cursor-pointer items-center justify-between rounded bg-grey-850 pr-10 pl-8 text-left transition-colors hover:bg-grey-800"
      onClick={handleStakingClick}
    >
      <div className="flex items-center gap-6">
        <ZapIcon className="h-8 w-8 text-white" />
        <div className="flex flex-col">
          <div className="!text-white font-bold text-base">{t("Staking")}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-body-secondary text-sm">{t("Self-stake through Talisman portal")}</div>
        <ExternalLinkIcon className="h-8 w-8 text-body-secondary" />
      </div>
    </button>
  )
}

export const DashboardEarnPositionsTab: FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation()

  return (
    <div className="min-w-[28.125rem] text-left text-base text-body-secondary">
      <div className="mb-4">
        <h2 className="mb-4 font-medium text-body-secondary text-sm">{t("Staking")}</h2>
        <StakingTile />
      </div>

      <EarnPositionsList search={search} />
    </div>
  )
}
