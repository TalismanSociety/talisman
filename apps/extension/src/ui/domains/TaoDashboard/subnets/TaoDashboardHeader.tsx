import { Balances } from "@talismn/balances"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { cn } from "@talismn/util"
import { useBalances, useIsBalanceInitializing, useToken } from "@ui/state"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { TokensAndFiat } from "../../Asset/TokensAndFiat"
import { BITTENSOR_NETWORK_ID } from "./constants"

export const PoweredBySn45 = () => (
  <a
    href="https://taostats.io/subnets/netuid-45/"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 rounded-full bg-grey-800 px-3 py-1.5 text-body-secondary text-xs transition-colors hover:bg-grey-750 hover:text-body"
  >
    <span>Powered by</span>
    <span className="font-semibold text-primary">SN45</span>
  </a>
)

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
      <div className="self-end px-6 py-4">
        <PoweredBySn45 />
      </div>
    </div>
  )
}
