import { AlertTriangleIcon, ShieldOkIcon, XOctagonIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import type { TokenRiskFeature, TokenRiskScan, TokenRiskVerdict } from "./tokenRiskScan"

export const TOKEN_RISK_COLOR_CLASSES: Record<Exclude<TokenRiskVerdict, "unknown">, string> = {
  Malicious: "text-alert-error bg-alert-error/10",
  Warning: "text-alert-warn bg-alert-warn/10",
  Spam: "text-alert-warn bg-alert-warn/10",
  Benign: "text-alert-success bg-alert-success/10",
}

export const TokenRiskVerdictIcon: FC<{ verdict: TokenRiskVerdict; className?: string }> = ({
  verdict,
  className,
}) => {
  if (verdict === "Malicious") return <XOctagonIcon className={className} />
  if (verdict === "Benign") return <ShieldOkIcon className={className} />
  return <AlertTriangleIcon className={className} />
}

export const useTokenRiskVerdictLabel = () => {
  const { t } = useTranslation()
  return (verdict: TokenRiskVerdict) => {
    switch (verdict) {
      case "Malicious":
        return t("Malicious")
      case "Warning":
        return t("Risky")
      case "Spam":
        return t("Spam")
      case "Benign":
        return t("Verified")
      default:
        return t("Unknown")
    }
  }
}

const useTokenRiskHeadline = () => {
  const { t } = useTranslation()
  return (verdict: TokenRiskVerdict, symbol: string) => {
    switch (verdict) {
      case "Malicious":
        return t(
          "Blockaid flagged {{symbol}} as malicious. Interacting with it may result in a loss of funds.",
          { symbol }
        )
      case "Warning":
        return t("Blockaid found risks with {{symbol}}. Review them carefully before proceeding.", {
          symbol,
        })
      case "Spam":
        return t("Blockaid flagged {{symbol}} as spam. It is likely worthless or deceptive.", {
          symbol,
        })
      case "Benign":
        return t("Blockaid found no risks with {{symbol}}.", { symbol })
      default:
        return t("Blockaid has no verdict for {{symbol}}.", { symbol })
    }
  }
}

const FEATURE_TYPE_ORDER = ["Malicious", "Warning", "Info", "Benign"]

const getFeatureTypeRank = (type: string) => {
  const rank = FEATURE_TYPE_ORDER.indexOf(type)
  return rank === -1 ? FEATURE_TYPE_ORDER.length : rank
}

const groupFeaturesByType = (features: TokenRiskFeature[]) => {
  const groups = new Map<string, TokenRiskFeature[]>()
  for (const feature of features)
    groups.set(feature.type, [...(groups.get(feature.type) ?? []), feature])
  return [...groups.entries()].sort(
    ([typeA], [typeB]) => getFeatureTypeRank(typeA) - getFeatureTypeRank(typeB)
  )
}

const formatPercent = (value: number) =>
  `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
const formatFraction = (value: number) => formatPercent(value * 100)
const formatUsd = (value: number) =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const formatCount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 })

export const TokenRiskDetails: FC<{ scan: TokenRiskScan; symbol: string; className?: string }> = ({
  scan,
  symbol,
  className,
}) => {
  const { t } = useTranslation()
  const getLabel = useTokenRiskVerdictLabel()
  const getHeadline = useTokenRiskHeadline()
  const { verdict, features, fees, financialStats } = scan

  const feeRows = [
    [t("Buy fee"), fees.buy],
    [t("Sell fee"), fees.sell],
    [t("Transfer fee"), fees.transfer],
  ].filter((row): row is [string, number] => typeof row[1] === "number" && row[1] > 0)

  const statRows = [
    [t("Holders"), financialStats.holdersCount, formatCount],
    [t("Total reserve"), financialStats.totalReserveInUsd, formatUsd],
    [t("Locked liquidity"), financialStats.lockedLiquidityPercentage, formatPercent],
  ].filter((row): row is [string, number, (value: number) => string] => typeof row[1] === "number")

  return (
    <div className={cn("flex w-full flex-col gap-8 text-sm", className)}>
      <div className="flex flex-col items-center gap-4 text-center">
        {verdict !== "unknown" && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1 text-xs",
              TOKEN_RISK_COLOR_CLASSES[verdict]
            )}
          >
            <TokenRiskVerdictIcon verdict={verdict} />
            <span>{getLabel(verdict)}</span>
          </div>
        )}
        <p className="text-body leading-paragraph">{getHeadline(verdict, symbol)}</p>
      </div>
      {features.length > 0 && (
        <div className="scrollable scrollable-700 flex max-h-[24rem] flex-col gap-6 overflow-y-auto">
          {groupFeaturesByType(features).map(([type, group]) => (
            <div key={type} className="flex flex-col gap-2">
              <div className="text-body-secondary text-xs uppercase">{type}</div>
              <ul className="flex flex-col gap-2">
                {group.map((feature) => (
                  <li key={feature.id} className="text-body-secondary leading-paragraph">
                    {feature.description}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {(feeRows.length > 0 || statRows.length > 0) && (
        <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-body-secondary">
          {feeRows.map(([label, value]) => (
            <TokenRiskRow key={label} label={label} value={formatFraction(value)} />
          ))}
          {statRows.map(([label, value, format]) => (
            <TokenRiskRow key={label} label={label} value={format(value)} />
          ))}
        </div>
      )}
      <div className="text-center text-body-disabled text-xs">{t("Powered by Blockaid")}</div>
    </div>
  )
}

const TokenRiskRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <>
    <div>{label}</div>
    <div className="text-right text-body">{value}</div>
  </>
)
