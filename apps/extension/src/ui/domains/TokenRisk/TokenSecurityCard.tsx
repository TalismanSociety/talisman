import type { Token } from "@talismn/chaindata-provider"
import { Checkbox } from "@ui/components/Checkbox"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { BlockaidLogo } from "./BlockaidLogo"
import { GoPlusReportRow } from "./GoPlusReportCard"
import { getGoPlusReportUrl } from "./goPlusReport"
import { TokenReportCard, TokenReportRow } from "./TokenReportCard"
import { TokenRiskScanningPill, TokenRiskVerdictPill } from "./TokenRiskPill"
import type { TokenRiskScan } from "./tokenRiskScan"

const TokenRiskRow: FC<{ scan: TokenRiskScan | undefined; symbol: string }> = ({
  scan,
  symbol,
}) => {
  const { t } = useTranslation()

  if (scan?.verdict === "unknown") return null

  return (
    <TokenReportRow
      logo={<BlockaidLogo className="h-8 w-auto text-body" />}
      title={t("Blockaid Token Scan")}
      action={
        scan ? <TokenRiskVerdictPill scan={scan} symbol={symbol} /> : <TokenRiskScanningPill />
      }
    />
  )
}

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

  const hasGoPlusReport = !!getGoPlusReportUrl(token)
  const hasRiskScan = scan?.verdict !== "unknown"

  if (!hasGoPlusReport && !hasRiskScan) return null

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <TokenReportCard>
        <GoPlusReportRow token={token} />
        <TokenRiskRow scan={scan} symbol={symbol} />
      </TokenReportCard>
      {scan?.verdict === "Malicious" && onAcknowledgedChange && (
        <div className="text-left text-body-secondary text-sm">
          <Checkbox
            checked={isAcknowledged}
            onChange={(e) => onAcknowledgedChange(e.target.checked)}
          >
            {t("I acknowledge the risks")}
          </Checkbox>
        </div>
      )}
    </div>
  )
}
