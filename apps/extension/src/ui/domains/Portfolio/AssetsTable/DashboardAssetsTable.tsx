import { Balances } from "@core/domains/balances/types"
import useBalances from "@ui/hooks/useBalances"
import { useTranslation } from "react-i18next"

import { useSelectedAccount } from "../useSelectedAccount"
import { AssetRow } from "./DashboardAssetRow"
import { usePortfolioSymbolBalances } from "./usePortfolioSymbolBalances"

type AssetsTableProps = {
  balances: Balances
}

export const DashboardAssetsTable = ({ balances }: AssetsTableProps) => {
  const { t } = useTranslation()
  // group by token (symbol)
  const { account } = useSelectedAccount()
  const { symbolBalances } = usePortfolioSymbolBalances(balances)

  // assume balance subscription is initializing if there are no balances at all in the db
  const allBalances = useBalances("all")
  if (!allBalances.count) return null

  if (!symbolBalances.length)
    return (
      <div className="text-body-secondary bg-grey-850 mt-12 rounded-sm p-8">
        {account ? t("No assets were found on this account.") : t("No assets were found.")}
      </div>
    )

  return (
    <div className="text-body-secondary min-w-[45rem] text-left text-base">
      <div className="mb-5 grid grid-cols-[40%_30%_30%] text-sm font-normal">
        <div>{t("Asset")}</div>
        <div className="text-right">{t("Locked")}</div>
        <div className="text-right">{t("Available")}</div>
      </div>

      {symbolBalances.map(([symbol, b]) => (
        <AssetRow key={symbol} balances={b} />
      ))}
    </div>
  )
}
