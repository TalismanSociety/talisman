import type { TokenId } from "@talismn/chaindata-provider"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useToken } from "@ui/state/chaindata"
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
import { useTokenRiskScan } from "./useTokenRiskScan"

const VARIANT_CLASS_NAMES = {
  pill: "inline-flex shrink-0 items-center gap-1 rounded-xs border border-current px-2 py-1 text-tiny uppercase",
  button: TOKEN_REPORT_BUTTON_CLASS_NAME,
}

export const TokenRiskVerdictPill: FC<{
  scan: TokenRiskScan
  symbol: string
  variant?: keyof typeof VARIANT_CLASS_NAMES
  className?: string
}> = ({ scan, symbol, variant = "pill", className }) => {
  const getLabel = useTokenRiskVerdictLabel()
  const { isOpen, open, close } = useOpenClose()

  if (scan.verdict === "unknown") return null

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={cn(
          VARIANT_CLASS_NAMES[variant],
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

export const TokenRiskPill: FC<{ tokenId: TokenId; className?: string }> = ({
  tokenId,
  className,
}) => {
  const token = useToken(tokenId)
  const { scan } = useTokenRiskScan(token, "token-settings")

  if (!token || !scan) return null

  return <TokenRiskVerdictPill scan={scan} symbol={token.symbol} className={className} />
}
