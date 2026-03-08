import { TALISMAN_WEB_APP_STAKING_URL } from "@common/constants"
import { ExternalLinkIcon, ZapIcon } from "@talismn/icons"
import { EarnPositionsList } from "@ui/domains/Earn/components/EarnPositionsList"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

const PopupStakingTile = () => {
  const { t } = useTranslation()

  const handleStakingClick = () => {
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
  }

  return (
    <button
      type="button"
      className="mb-4 flex h-[5.2rem] w-full cursor-pointer items-center justify-between rounded bg-grey-850 pr-8 pl-6 text-left transition-colors hover:bg-grey-800"
      onClick={handleStakingClick}
    >
      <div className="flex items-center gap-4">
        <ZapIcon className="h-6 w-6 text-white" />
        <div className="flex flex-col">
          <div className="font-bold text-sm text-white">{t("Staking")}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-body-secondary text-xs">{t("Self-stake through Talisman portal")}</div>
        <ExternalLinkIcon className="h-6 w-6 text-body-secondary" />
      </div>
    </button>
  )
}

export const PopupEarnPositionsTab: FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation()

  return (
    <div className="@container flex w-full flex-col @2xl:gap-8 gap-4">
      {/* Staking Section */}
      <div>
        <h2 className="mb-4 font-medium text-body-secondary text-sm">{t("Staking")}</h2>
        <PopupStakingTile />
      </div>
      <EarnPositionsList search={search} />
    </div>
  )
}
