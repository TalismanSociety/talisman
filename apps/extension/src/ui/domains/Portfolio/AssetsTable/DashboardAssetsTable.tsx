import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useSelectedCurrency } from "@ui/hooks/useCurrency"

import { Statistics } from "../Statistics"
import { usePortfolioDisplayBalances } from "../useDisplayBalances"
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

const HeaderRow = () => {
  const balances = usePortfolioDisplayBalances("network")
  const { t } = useTranslation()

  const currency = useSelectedCurrency()

  const {
    total: portfolio,
    transferable: available,
    unavailable: locked,
  } = useMemo(() => balances.sum.fiat(currency), [balances.sum, currency])

  return (
    <div className="text-body-secondary bg-grey-850 mb-12 rounded p-8 text-left text-base">
      <div className="grid grid-cols-[40%_30%_30%]">
        <Statistics
          className="h-auto w-auto p-0"
          title={t("Total Value")}
          fiat={portfolio}
          showCurrencyToggle
        />
        <Statistics
          className="h-auto w-auto items-end p-0 pr-8"
          title={t("Locked")}
          fiat={locked}
          locked
        />
        <Statistics
          className="h-auto w-auto items-end p-0"
          title={t("Available")}
          fiat={available}
        />
      </div>
    </div>
  )
}

export const DashboardAssetsTable = () => {
  const { t } = useTranslation()
  const { isInitialising } = usePortfolio()
  const { account } = useSelectedAccount()
  // group by token (symbol)
  const { symbolBalances } = usePortfolioSymbolBalancesByFilter("search")

  if (!symbolBalances.length && !isInitialising) {
    return (
      <div className="text-body-secondary bg-grey-850 rounded-sm p-8">
        {account ? t("No assets were found on this account.") : t("No assets were found.")}
      </div>
    )
  }

  return (
    <div className="text-body-secondary min-w-[45rem] text-left text-base">
      {!!symbolBalances.length && <HeaderRow />}

      {symbolBalances.map(([symbol, b]) => (
        <AssetRow key={symbol} balances={b} />
      ))}
      {isInitialising && <AssetRowSkeleton />}
    </div>
  )
}
