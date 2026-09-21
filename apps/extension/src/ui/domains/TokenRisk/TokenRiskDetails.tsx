import { AlertTriangleIcon, ShieldOkIcon, XOctagonIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { BlockaidLogo } from "./BlockaidLogo"
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
        return t("Passed")
      default:
        return t("Unknown")
    }
  }
}

const useTokenRiskTitle = () => {
  const { t } = useTranslation()
  return (verdict: TokenRiskVerdict) => {
    switch (verdict) {
      case "Malicious":
        return t("Malicious token")
      case "Warning":
        return t("Risky token")
      case "Spam":
        return t("Spam token")
      case "Benign":
        return t("No risks found")
      default:
        return t("No verdict available")
    }
  }
}

const useTokenRiskHeadline = () => {
  const { t } = useTranslation()
  return (verdict: TokenRiskVerdict, symbol: string) => {
    switch (verdict) {
      case "Malicious":
        return t("{{symbol}} shows malicious behaviour. You could lose funds if you use it.", {
          symbol,
        })
      case "Warning":
        return t("{{symbol}} shows signs of risk. Review the findings before you proceed.", {
          symbol,
        })
      case "Spam":
        return t("{{symbol}} looks like spam. It is likely worthless or deceptive.", { symbol })
      case "Benign":
        return t("{{symbol}} passed all security checks.", { symbol })
      default:
        return t("{{symbol}} could not be analysed.", { symbol })
    }
  }
}

const FINDING_TYPE_ORDER = ["Malicious", "Warning", "Info"]

const FINDING_CARD_CLASSES: Record<string, string> = {
  Malicious: "bg-alert-error/12",
}

const FINDING_DOT_CLASSES: Record<string, string> = {
  Malicious: "text-alert-error bg-alert-error/15",
  Warning: "text-alert-warn bg-alert-warn/15",
  Info: "bg-white/15 text-grey-400",
}

const getFindingRank = (type: string) => {
  const rank = FINDING_TYPE_ORDER.indexOf(type)
  return rank === -1 ? FINDING_TYPE_ORDER.length : rank
}

const getFindings = (features: TokenRiskFeature[]) =>
  features
    .filter((feature) => feature.type !== "Benign")
    .sort((a, b) => getFindingRank(a.type) - getFindingRank(b.type))

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
  const getTitle = useTokenRiskTitle()
  const getHeadline = useTokenRiskHeadline()
  const { verdict, fees, financialStats } = scan
  const findings = getFindings(scan.features)

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
      <div className="flex flex-col items-center text-center">
        {verdict !== "unknown" && (
          <div
            className={cn(
              "flex size-24 items-center justify-center rounded-full",
              TOKEN_RISK_COLOR_CLASSES[verdict]
            )}
          >
            <TokenRiskVerdictIcon verdict={verdict} className="size-12" />
          </div>
        )}
        <div className="mt-6 font-bold text-body text-md">{getTitle(verdict)}</div>
        <p className="mt-4 text-body-secondary leading-paragraph">{getHeadline(verdict, symbol)}</p>
        <div className="mt-8 flex items-center gap-3 rounded bg-grey-800 px-6 py-2 text-body-secondary text-xs leading-paragraph">
          <div>{t("Powered by")}</div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-black">
              <BlockaidLogo className="h-4 w-auto text-white" />
            </div>
            <div>Blockaid</div>
          </div>
        </div>
      </div>
      <hr className="border-body-disabled/30" />
      {findings.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="text-body">{t("Findings")}</div>
          <ul className="scrollable scrollable-700 flex max-h-[24rem] flex-col gap-6 overflow-y-auto">
            {findings.map((finding) => (
              <li
                key={finding.id}
                className={cn(
                  "flex items-center gap-6 rounded px-10 py-6 text-left text-body-secondary text-xs leading-paragraph",
                  FINDING_CARD_CLASSES[finding.type] ?? "bg-grey-900"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    FINDING_DOT_CLASSES[finding.type] ?? "bg-white/15 text-white"
                  )}
                >
                  <div className="size-3 rounded-full bg-current" />
                </div>
                <div>{finding.description}</div>
              </li>
            ))}
          </ul>
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
    </div>
  )
}

const TokenRiskRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <>
    <div>{label}</div>
    <div className="text-right text-body">{value}</div>
  </>
)
