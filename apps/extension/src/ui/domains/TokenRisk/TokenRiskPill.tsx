import type { TokenId } from "@talismn/chaindata-provider"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import type { FC } from "react"

import {
  TOKEN_RISK_COLOR_CLASSES,
  TokenRiskVerdictIcon,
  useTokenRiskVerdictLabel,
} from "./TokenRiskDetails"
import { TokenRiskDrawer } from "./TokenRiskDrawer"
import { useTokenRiskScan } from "./useTokenRiskScan"

export const TokenRiskPill: FC<{ tokenId: TokenId; className?: string }> = ({
  tokenId,
  className,
}) => {
  const token = useToken(tokenId)
  const { scan } = useTokenRiskScan(token, "token-details")
  const getLabel = useTokenRiskVerdictLabel()
  const { isOpen, open, close } = useOpenClose()

  if (!token || !scan || scan.verdict === "unknown") return null

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={cn(
          "ml-3 inline-flex items-center gap-1 rounded px-3 py-1 align-middle font-light text-tiny hover:opacity-80",
          TOKEN_RISK_COLOR_CLASSES[scan.verdict],
          className
        )}
      >
        <TokenRiskVerdictIcon verdict={scan.verdict} />
        <span>{getLabel(scan.verdict)}</span>
      </button>
      <TokenRiskDrawer
        scan={scan}
        symbol={token.symbol}
        isOpen={isOpen}
        variant={IS_POPUP ? "drawer" : "modal"}
        onDismiss={close}
      />
    </>
  )
}
