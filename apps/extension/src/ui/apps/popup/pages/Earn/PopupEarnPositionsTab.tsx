import { ExternalLinkIcon, ZapIcon } from "@talismn/icons"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { EarnPositionsList } from "@ui/domains/Earn/components/PositionsTab/EarnPositionsList"

const PopupStakingTile = () => {
  const { t } = useTranslation()

  const handleStakingClick = () => {
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
  }

  return (
    <button
      type="button"
      className="bg-grey-850 hover:bg-grey-800 mb-4 flex h-[5.2rem] w-full cursor-pointer items-center justify-between rounded pl-6 pr-8 text-left transition-colors"
      onClick={handleStakingClick}
    >
      <div className="flex items-center gap-4">
        <ZapIcon className="h-6 w-6 text-white" />
        <div className="flex flex-col">
          <div className="text-sm font-bold text-white">{t("Staking")}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-body-secondary text-xs">{t("Self-stake through Talisman portal")}</div>
        <ExternalLinkIcon className="text-body-secondary h-6 w-6" />
      </div>
    </button>
  )
}

export const PopupEarnPositionsTab: FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Staking Section */}
      <div className="mb-4">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Staking")}</h2>
        <PopupStakingTile />
      </div>
      <EarnPositionsList search={search} />
    </div>
  )
}
