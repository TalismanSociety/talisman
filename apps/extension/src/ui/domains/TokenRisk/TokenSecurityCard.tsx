import type { Token } from "@talismn/chaindata-provider"
import { Checkbox } from "@ui/components/Checkbox"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { BlockaidLogo } from "./BlockaidLogo"
import { GoPlusReportRow } from "./GoPlusReportCard"
import { TokenReportCard, TokenReportPlaceholderPill, TokenReportRow } from "./TokenReportCard"
import { TokenRiskScanningPill, TokenRiskVerdictPill } from "./TokenRiskPill"
import type { TokenRiskScan } from "./tokenRiskScan"

const TokenRiskRow: FC<{ scan: TokenRiskScan | undefined; symbol: string }> = ({
  scan,
  symbol,
}) => {
  const { t } = useTranslation()

  const getAction = () => {
    if (!scan) return <TokenRiskScanningPill />
    if (scan.verdict !== "unknown") return <TokenRiskVerdictPill scan={scan} symbol={symbol} />
    return (
      <TokenReportPlaceholderPill
        tooltip={
          scan.isChainUnsupported
            ? t("Blockaid token scan isn't available on this network")
            : t("Blockaid token scan isn't available for this token")
        }
      >
        {t("Unavailable")}
      </TokenReportPlaceholderPill>
    )
  }

  return (
    <TokenReportRow
      logo={<BlockaidLogo className="h-8 w-auto text-body" />}
      title={t("Blockaid Token Scan")}
      action={getAction()}
    />
  )
}

export const TokenSecurityPanels: FC<{
  token: Token | null | undefined
  scan: TokenRiskScan | undefined
  symbol: string
  className?: string
}> = ({ token, scan, symbol, className }) => (
  <div className={cn("grid w-full grid-cols-2 gap-x-12", className)}>
    <TokenReportCard className="h-24 justify-center py-0">
      <GoPlusReportRow token={token} />
    </TokenReportCard>
    <TokenReportCard
      className={cn(
        "h-24 justify-center py-0",
        scan?.verdict === "Malicious" && "border-alert-error/40"
      )}
    >
      <TokenRiskRow scan={scan} symbol={symbol} />
    </TokenReportCard>
  </div>
)

type TokenSecurityCardProps = {
  token: Token | null | undefined
  scan: TokenRiskScan | undefined
  symbol: string
  isAcknowledged?: boolean
  onAcknowledgedChange?: (isAcknowledged: boolean) => void
  className?: string
}

export const TokenSecurityCard: FC<TokenSecurityCardProps> = ({
  token,
  scan,
  symbol,
  isAcknowledged,
  onAcknowledgedChange,
  className,
}) => {
  const { t } = useTranslation()

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <TokenReportCard>
        <GoPlusReportRow token={token} />
        <TokenRiskRow scan={scan} symbol={symbol} />
      </TokenReportCard>
      <div
        className={cn(
          "pl-6 text-left text-body-secondary text-sm",
          scan?.verdict === "Malicious" && onAcknowledgedChange ? "visible" : "invisible"
        )}
      >
        <Checkbox
          checked={isAcknowledged}
          onChange={(e) => onAcknowledgedChange?.(e.target.checked)}
        >
          {t("I acknowledge the risks")}
        </Checkbox>
      </div>
    </div>
  )
}
