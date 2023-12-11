import { Balances } from "@core/domains/balances/types"
import { useTranslation } from "react-i18next"

import { AssetRow, AssetRowSkeleton } from "./DashboardAssetRow"
import { usePortfolioSymbolBalances } from "./usePortfolioSymbolBalances"

type AssetsTableProps = {
  balances: Balances
}

const getSkeletonOpacity = (index: number) => {
  // tailwind parses files to find classes that it should include in it's bundle
  // so we can't dynamically compute the className
  switch (index) {
    case 0:
      return "opacity-100"
    case 1:
      return "opacity-80"
    case 2:
      return "opacity-60"
    case 3:
      return "opacity-40"
    case 4:
      return "opacity-30"
    case 5:
      return "opacity-20"
    case 6:
      return "opacity-10"
    default:
      return "opacity-0"
  }
}

export const DashboardAssetsTable = ({ balances }: AssetsTableProps) => {
  const { t } = useTranslation()
  // group by token (symbol)
  const { symbolBalances, skeletons } = usePortfolioSymbolBalances(balances)

  return (
    <div className="text-body-secondary min-w-[45rem] text-left text-base">
      <div className="mb-5 grid grid-cols-[40%_30%_30%] text-sm font-normal">
        <div>Asset</div>
        <div className="text-right">{t("Locked")}</div>
        <div className="text-right">{t("Available")}</div>
      </div>

      {symbolBalances.map(([symbol, b]) => (
        <AssetRow key={symbol} balances={b} />
      ))}
      {[...Array(skeletons).keys()].map((i) => (
        <AssetRowSkeleton key={i} className={getSkeletonOpacity(i)} />
      ))}
    </div>
  )
}
