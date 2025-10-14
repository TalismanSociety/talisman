import { Balances } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"

import { usePortfolioGlobalData, useSelectedCurrency } from "@ui/state"

import { SeekBenefitsBanner } from "../SeekBenefits/SeekBenefitsBanner"
import { SeekPresaleBanner } from "../SeekPresale/SeekPresaleBanner"
import { Statistics } from "../Statistics"
import { usePortfolioDisplayBalances } from "../useDisplayBalances"
import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { AssetRow } from "./DashboardAssetRow"
import { usePortfolioSymbolBalancesByFilter } from "./usePortfolioSymbolBalances"

const AssetRowSkeleton: FC<{ className?: string }> = ({ className }) => {
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

const HeaderRow = () => {
  const balances = usePortfolioDisplayBalances("network")
  const { t } = useTranslation()

  const currency = useSelectedCurrency()

  const {
    total: portfolio,
    transferable: available,
    unavailable: locked,
  } = useMemo(() => balances.sum.fiat(currency), [balances.sum, currency])

  if (!balances.count) return null

  return (
    <div className="text-body-secondary bg-grey-850 mb-4 grid h-40 grid-cols-[40%_30%_30%] items-center rounded px-8 text-left text-base">
      <Statistics
        className="h-auto w-auto p-0"
        title={t("Total Value")}
        fiat={portfolio}
        showCurrencyToggle
        align="left"
      />
      <Statistics
        className="h-auto w-auto items-end p-0 pr-8"
        title={t("Locked")}
        fiat={locked}
        locked
        align="right"
      />
      <Statistics
        className="h-auto w-auto items-end p-0"
        title={t("Available")}
        fiat={available}
        align="right"
      />
    </div>
  )
}

const NoAssetsFound = () => {
  const { t } = useTranslation()
  const { selectedAccount, selectedFolder } = usePortfolioNavigation()

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

export const DashboardAssetsTable = () => {
  const { isInitialising } = usePortfolioGlobalData()
  const { symbolBalances } = usePortfolioSymbolBalancesByFilter("search")
  const location = useLocation()

  return (
    <div key={location.key} className="text-body-secondary min-w-[45rem] text-left text-base">
      <SeekBenefitsBanner className="mb-2" variant="large" />
      <SeekPresaleBanner className="mb-2" variant="large" />
      {!symbolBalances.length && !isInitialising && <NoAssetsFound />}
      {!!symbolBalances.length && <HeaderRow />}
      <VirtualizedRows symbolBalances={symbolBalances} />
      {isInitialising && <AssetRowSkeleton />}
    </div>
  )
}

const VirtualizedRows: FC<{ symbolBalances: [string, Balances][] }> = ({ symbolBalances }) => {
  const [noCountUp, setNoCountUp] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      // we only want count up on the first rendering of the table
      // ex: sorting or filtering rows using search box should not trigger count up
      setNoCountUp(true)
    }, 500)

    return () => clearTimeout(timeout)
  }, [])

  const virtualizer = useVirtualizer({
    count: symbolBalances.length,
    overscan: 6,
    gap: 8,
    estimateSize: () => 66,
    getScrollElement: () => document.getElementById("main"),
  })

  return (
    <div>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            className="absolute left-0 top-0 w-full"
            style={{
              height: `${item.size}px`,
              transform: `translateY(${item.start}px)`,
            }}
          >
            {!!symbolBalances[item.index] && (
              <AssetRow balances={symbolBalances[item.index][1]} noCountUp={noCountUp} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
