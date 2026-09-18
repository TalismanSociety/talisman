import { Checkbox } from "@ui/components/Checkbox"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { TokenRiskDetails } from "./TokenRiskDetails"
import type { TokenRiskScan } from "./tokenRiskScan"

type TokenRiskBannerProps = {
  scan: TokenRiskScan | undefined
  symbol: string
  isAcknowledged: boolean
  onAcknowledgedChange: (isAcknowledged: boolean) => void
  className?: string
}

export const TokenRiskBanner: FC<TokenRiskBannerProps> = ({
  scan,
  symbol,
  isAcknowledged,
  onAcknowledgedChange,
  className,
}) => {
  const { t } = useTranslation()

  if (!scan || scan.verdict === "unknown" || scan.verdict === "Benign") return null

  return (
    <div
      className={cn(
        "flex flex-col gap-8 rounded border p-8",
        scan.verdict === "Malicious" ? "border-alert-error/50" : "border-alert-warn/50",
        className
      )}
    >
      <TokenRiskDetails scan={scan} symbol={symbol} />
      {scan.verdict === "Malicious" && (
        <div className="text-body-secondary text-sm">
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
