import { ArrowDownRightIcon, ArrowUpRightIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import type { FC, PropsWithChildren, ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { useSubnetStats } from "./useSubnetStats"

interface PriceChartHeaderProps {
  netuid: number
}

export const PriceChartHeader: FC<PriceChartHeaderProps> = ({ netuid }) => {
  const { t } = useTranslation()
  const { tokenPrice, tokenPriceUsd, priceChange24h, marketCap, volume24h, fdv, dailyEmissions } =
    useSubnetStats(netuid)

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-12 py-10">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-white text-xl">
            τ {tokenPrice?.toFixed(6) ?? "0.000000"}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-body-secondary text-md">
            ${tokenPriceUsd?.toFixed(6) ?? "0.00"}
          </span>
          {priceChange24h !== null && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-xs px-2 text-sm",
                priceChange24h >= 0 ? "bg-buy/10 text-buy" : "bg-sell/10 text-sell"
              )}
            >
              <span>{Math.abs(priceChange24h).toFixed(2)}%</span>
              {priceChange24h > 0 && <ArrowUpRightIcon className="size-4" />}
              {priceChange24h < 0 && <ArrowDownRightIcon className="size-6" />}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-12">
        <Metric label={t("Market Cap")}>
          <FiatFromUsd amount={marketCap} compact />
        </Metric>
        <Metric label={t("24h Volume")}>
          <FiatFromUsd amount={volume24h} compact />
        </Metric>
        <Metric label={t("FDV")}>
          <FiatFromUsd amount={fdv} compact />
        </Metric>
        <Metric label={t("Emissions")}>
          {dailyEmissions ? `τ${dailyEmissions.toFixed(3)}/d` : t("N/A")}
        </Metric>
      </div>
    </div>
  )
}

const Metric: FC<PropsWithChildren<{ label: ReactNode }>> = ({ label, children }) => {
  return (
    <div className="flex flex-col items-start justify-between gap-2">
      <span className="text-body-disabled text-xs">{label}</span>
      <span className="font-medium text-md text-white">{children}</span>
    </div>
  )
}
