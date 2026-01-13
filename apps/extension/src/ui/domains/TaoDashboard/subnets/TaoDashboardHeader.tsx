import { Balances } from "@talismn/balances"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { cn } from "@talismn/util"
import { useBalances, useIsBalanceInitializing, useToken } from "@ui/state"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { TokensAndFiat } from "../../Asset/TokensAndFiat"
import { BITTENSOR_NETWORK_ID } from "./constants"

export const TaoDashboardHeader = () => {
  const { t } = useTranslation()

  const tao = useToken(subNativeTokenId(BITTENSOR_NETWORK_ID))
  const ownedBalances = useBalances("owned")

  const taoBalances = useMemo(() => {
    if (!tao) return new Balances([])
    return ownedBalances.find({ tokenId: tao.id })
  }, [ownedBalances, tao])

  const isInitializing = useIsBalanceInitializing()

  const isLoading = useMemo(() => {
    return isInitializing || taoBalances.each.some((b) => b.status === "cache")
  }, [isInitializing, taoBalances])

  return (
    <div className="flex h-64 items-center justify-between rounded-[0.75rem] border border-grey-800 text-left text-base text-body-secondary">
      <div className="flex flex-col gap-4 px-6 py-8">
        <div className="text-body-secondary text-sm">{t("Available Tao Balance")}</div>
        <div className="font-bold text-2xl text-body">
          {!taoBalances.sum.planck.transferable && isLoading ? (
            <div className="animate-pulse rounded bg-grey-700 text-grey-700">$0.00</div>
          ) : (
            <TokensAndFiat
              tokenId={tao?.id}
              planck={taoBalances.sum.planck.transferable}
              className={cn(isLoading && "animate-pulse")}
              fiatClassName="text-body-secondary"
            />
          )}
        </div>
      </div>
    </div>
  )
}
