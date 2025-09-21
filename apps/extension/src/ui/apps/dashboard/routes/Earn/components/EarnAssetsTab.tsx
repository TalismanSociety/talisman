import { ZapFastIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TALISMAN_WEB_APP_STAKING_URL } from "extension-shared"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"

import { usePortfolioSymbolBalancesByFilter } from "@ui/domains/Portfolio/AssetsTable/usePortfolioSymbolBalances"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { usePortfolioGlobalData } from "@ui/state"

import { EarnTokenRow } from "./EarnTokenRow"

const EarnTokenRowSkeleton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={classNames(
        "text-body-secondary bg-grey-850 mb-4 mt-4 grid w-full grid-cols-[40%_30%_30%] rounded text-left text-base",
        className,
      )}
    >
      <div>
        <div className="flex h-[6.6rem]">
          <div className="p-8 text-xl">
            <div className="bg-grey-700 h-16 w-16 animate-pulse rounded-full"></div>
          </div>
          <div className="flex grow flex-col justify-center gap-2">
            <div className="bg-grey-700 rounded-xs h-8 w-20 animate-pulse"></div>
          </div>
        </div>
      </div>
      <div></div>
      <div>
        <div className="flex h-full flex-col items-end justify-center gap-2 px-8">
          <div className="bg-grey-700 rounded-xs h-8 w-[10rem] animate-pulse"></div>
          <div className="bg-grey-700 rounded-xs h-8 w-[6rem] animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

const StakingTile = () => {
  const { t } = useTranslation()

  const handleStakingClick = () => {
    window.open(TALISMAN_WEB_APP_STAKING_URL, "_blank")
  }

  return (
    <button
      type="button"
      className="bg-grey-850 hover:bg-grey-800 mb-4 flex h-[6.6rem] w-full cursor-pointer items-center justify-between rounded px-8 text-left transition-colors"
      onClick={handleStakingClick}
    >
      <div className="flex items-center gap-6">
        <ZapFastIcon className="text-primary h-8 w-8" />
        <div className="flex flex-col">
          <div className="text-body text-base font-bold">{t("Staking")}</div>
        </div>
      </div>
      <div className="text-body-secondary text-sm">
        {t("Go to Talisman Portal for more staking")}
      </div>
    </button>
  )
}

export const EarnAssetsTab = () => {
  const { t } = useTranslation()
  const { isInitialising } = usePortfolioGlobalData()
  const { selectedAccount, selectedFolder } = usePortfolioNavigation()
  const { symbolBalances } = usePortfolioSymbolBalancesByFilter("search")

  const location = useLocation()

  if (!symbolBalances.length && !isInitialising) {
    return (
      <div className="text-body-secondary bg-grey-850 mb-4 flex h-[6.6rem] flex-col justify-center rounded-sm p-8">
        {selectedAccount
          ? t("No assets were found on this account.")
          : selectedFolder
            ? t("No assets were found in this folder.")
            : t("No assets were found.")}
      </div>
    )
  }

  return (
    <div key={location.key} className="text-body-secondary min-w-[45rem] text-left text-base">
      {/* Staking Section */}
      <div className="mb-4">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Staking")}</h2>
        <StakingTile />
      </div>

      {/* Defi Section */}
      <div className="mb-4">
        <h2 className="text-body-secondary mb-4 text-sm font-medium">{t("Defi")}</h2>
        <div className="space-y-0">
          {symbolBalances.length > 0 ? (
            symbolBalances.map(([symbol, balances]) => (
              <EarnTokenRow key={symbol} balances={balances} noCountUp />
            ))
          ) : !isInitialising ? (
            <div className="text-body-secondary bg-grey-850 mb-4 flex h-[6.6rem] flex-col justify-center rounded-sm p-8">
              {selectedAccount
                ? t("No assets were found on this account.")
                : selectedFolder
                  ? t("No assets were found in this folder.")
                  : t("No assets were found.")}
            </div>
          ) : null}
        </div>
      </div>
      {isInitialising && <EarnTokenRowSkeleton />}
    </div>
  )
}
