import { LoaderIcon } from "@talismn/icons"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { TOKEN_REPORT_BUTTON_CLASS_NAME } from "./TokenReportCard"
import {
  TOKEN_RISK_COLOR_CLASSES,
  TokenRiskVerdictIcon,
  useTokenRiskVerdictLabel,
} from "./TokenRiskDetails"
import { TokenRiskModal } from "./TokenRiskModal"
import type { TokenRiskScan, TokenRiskVerdict } from "./tokenRiskScan"

const TOKEN_RISK_HOVER_CLASSES: Record<Exclude<TokenRiskVerdict, "unknown">, string> = {
  Malicious: "hover:bg-alert-error/15",
  Warning: "hover:bg-alert-warn/15",
  Spam: "hover:bg-alert-warn/15",
  Benign: "hover:bg-alert-success/15",
}

export const TokenRiskScanningPill: FC = () => {
  const { t } = useTranslation()

  return (
    <div className={cn(TOKEN_REPORT_BUTTON_CLASS_NAME, "bg-grey-800 text-body-secondary")}>
      <LoaderIcon className="animate-spin-slow" />
      <span>{t("Scanning")}</span>
    </div>
  )
}

export const TokenRiskVerdictPill: FC<{
  scan: TokenRiskScan
  symbol: string
  className?: string
}> = ({ scan, symbol, className }) => {
  const getLabel = useTokenRiskVerdictLabel()
  const { isOpen, open, close } = useOpenClose()

  if (scan.verdict === "unknown") return null

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={cn(
          TOKEN_REPORT_BUTTON_CLASS_NAME,
          TOKEN_RISK_COLOR_CLASSES[scan.verdict],
          TOKEN_RISK_HOVER_CLASSES[scan.verdict],
          className
        )}
      >
        <TokenRiskVerdictIcon verdict={scan.verdict} />
        <span>{getLabel(scan.verdict)}</span>
      </button>
      <TokenRiskModal scan={scan} symbol={symbol} isOpen={isOpen} onDismiss={close} />
    </>
  )
}
