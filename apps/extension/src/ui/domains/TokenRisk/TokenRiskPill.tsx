import { useOpenClose } from "@ui/hooks/useOpenClose"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { TOKEN_REPORT_BUTTON_CLASS_NAME } from "./TokenReportCard"
import {
  TOKEN_RISK_COLOR_CLASSES,
  TokenRiskVerdictIcon,
  useTokenRiskVerdictLabel,
} from "./TokenRiskDetails"
import { TokenRiskModal } from "./TokenRiskModal"
import type { TokenRiskScan } from "./tokenRiskScan"

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
          "hover:opacity-80",
          TOKEN_RISK_COLOR_CLASSES[scan.verdict],
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
