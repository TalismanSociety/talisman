import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { usePortfolio } from "../usePortfolio"
import { useSelectedAccount } from "../useSelectedAccount"
import { AssetRow } from "./DashboardAssetRow"
import { usePortfolioSymbolBalancesByFilter } from "./usePortfolioSymbolBalances"

const AssetRowSkeleton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={classNames(
        "text-body-secondary bg-grey-850 mb-4 grid w-full grid-cols-[40%_30%_30%] rounded text-left text-base",
        className
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

export const DashboardAssetsTable = () => {
  const { t } = useTranslation()
  const { isInitializing } = usePortfolio()
  const { account } = useSelectedAccount()
  // group by token (symbol)
  const { symbolBalances } = usePortfolioSymbolBalancesByFilter("search")

  if (!symbolBalances.length && !isInitializing) {
    return (
      <div className="text-body-secondary bg-grey-850 mt-12 rounded-sm p-8">
        {account ? t("No assets were found on this account.") : t("No assets were found.")}
      </div>
    )
  }

  return (
    <div className="text-body-secondary min-w-[45rem] text-left text-base">
      {/* <NetworkPicker /> */}

      <div className="text-body-disabled my-5 mt-7 grid grid-cols-[40%_30%_30%] text-sm font-normal">
        <div className="pl-8">{t("Asset")}</div>
        <div className="pr-8 text-right">{t("Locked")}</div>
        <div className="pr-8 text-right">{t("Available")}</div>
      </div>

      {symbolBalances.map(([symbol, b]) => (
        <AssetRow key={symbol} balances={b} />
      ))}
      {isInitializing && <AssetRowSkeleton />}
    </div>
  )
}
