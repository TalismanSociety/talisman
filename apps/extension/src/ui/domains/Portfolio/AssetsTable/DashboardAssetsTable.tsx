import type { Balances } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { usePortfolioGlobalData } from "@ui/state/portfolio"
import { useSelectedCurrency } from "@ui/state/settings"
import { type FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"

import { Statistics } from "../Statistics"
import { usePortfolioDisplayBalances } from "../useDisplayBalances"
import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { AssetRow } from "./DashboardAssetRow"
import { usePortfolioSymbolBalancesByFilter } from "./usePortfolioSymbolBalances"

const AssetRowSkeleton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={classNames(
        "mt-4 mb-4 grid w-full grid-cols-[40%_30%_30%] rounded bg-grey-850 text-left text-base text-body-secondary",
        className
      )}
    >
      <div>
        <div className="flex h-[4.125rem]">
          <div className="p-8 text-xl">
            <div className="h-16 w-16 animate-pulse rounded-full bg-grey-700"></div>
          </div>
          <div className="flex grow flex-col justify-center gap-2">
            <div className="h-8 w-20 animate-pulse rounded-xs bg-grey-700"></div>
          </div>
        </div>
      </div>
      <div></div>
      <div>
        <div className="flex h-full flex-col items-end justify-center gap-2 px-8">
          <div className="h-8 w-[6.25rem] animate-pulse rounded-xs bg-grey-700"></div>
          <div className="h-8 w-[3.75rem] animate-pulse rounded-xs bg-grey-700"></div>
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
    <div className="mb-4 grid h-40 grid-cols-[40%_30%_30%] items-center rounded bg-grey-850 px-8 text-left text-base text-body-secondary">
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
    <div className="mb-4 flex h-[4.125rem] flex-col justify-center rounded-sm bg-grey-850 p-8 text-body-secondary">
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
    <div key={location.key} className="min-w-[28.125rem] text-left text-base text-body-secondary">
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
            className="absolute top-0 left-0 w-full"
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
