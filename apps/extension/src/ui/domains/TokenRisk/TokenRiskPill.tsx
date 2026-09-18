import type { TokenId } from "@talismn/chaindata-provider"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import type { FC } from "react"

import {
  TOKEN_RISK_COLOR_CLASSES,
  TokenRiskVerdictIcon,
  useTokenRiskVerdictLabel,
} from "./TokenRiskDetails"
import { TokenRiskModal } from "./TokenRiskModal"
import { useTokenRiskScan } from "./useTokenRiskScan"

export const TokenRiskPill: FC<{ tokenId: TokenId; className?: string }> = ({
  tokenId,
  className,
}) => {
  const token = useToken(tokenId)
  const { scan } = useTokenRiskScan(token, "token-settings")
  const getLabel = useTokenRiskVerdictLabel()
  const { isOpen, open, close } = useOpenClose()

  if (!token || !scan || scan.verdict === "unknown") return null

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={cn(
          "inline-flex items-center gap-1 rounded-xs border border-current px-2 py-1 text-tiny uppercase hover:opacity-80",
          TOKEN_RISK_COLOR_CLASSES[scan.verdict],
          className
        )}
      >
        <TokenRiskVerdictIcon verdict={scan.verdict} />
        <span>{getLabel(scan.verdict)}</span>
      </button>
      <TokenRiskModal scan={scan} symbol={token.symbol} isOpen={isOpen} onDismiss={close} />
    </>
  )
}
