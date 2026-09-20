import { LoaderIcon } from "@talismn/icons"
import { Checkbox } from "@ui/components/Checkbox"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { BlockaidLogo } from "./BlockaidLogo"
import { TOKEN_REPORT_BUTTON_CLASS_NAME, TokenReportCard } from "./TokenReportCard"
import { TokenRiskVerdictPill } from "./TokenRiskPill"
import type { TokenRiskScan } from "./tokenRiskScan"

type TokenRiskCardProps = {
  scan: TokenRiskScan | undefined
  symbol: string
  isAcknowledged?: boolean
  onAcknowledgedChange?: (isAcknowledged: boolean) => void
  className?: string
}

export const TokenRiskCard: FC<TokenRiskCardProps> = ({
  scan,
  symbol,
  isAcknowledged,
  onAcknowledgedChange,
  className,
}) => {
  const { t } = useTranslation()

  if (scan?.verdict === "unknown") return null

  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      <TokenReportCard
        logo={<BlockaidLogo className="h-14 w-auto text-body" />}
        title={t("Token Scan")}
        subtitle={t("Powered by Blockaid")}
        action={
          scan ? (
            <TokenRiskVerdictPill scan={scan} symbol={symbol} />
          ) : (
            <div className={cn(TOKEN_REPORT_BUTTON_CLASS_NAME, "bg-grey-800 text-body-secondary")}>
              <LoaderIcon className="animate-spin-slow" />
              <span>{t("Scanning")}</span>
            </div>
          )
        }
      />
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
