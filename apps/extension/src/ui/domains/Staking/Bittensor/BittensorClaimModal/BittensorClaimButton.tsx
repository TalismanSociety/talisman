import { isAccountOwned } from "@core/domains/keyring/exports"
import type { TokenId } from "@talismn/chaindata-provider"
import { ZapPlusIcon } from "@talismn/icons"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBittensorNetworkIds } from "@ui/state/bittensor"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { ROOT_NETUID } from "../utils/constants"
import { useBittensorClaimModal } from "./hooks/useBittensorClaimModal"

export const BittensorClaimButton: FC<{
  tokenId: TokenId
  address: string
  className?: string
  variant: "small" | "large"
}> = ({ tokenId, address, variant, className }) => {
  const { t } = useTranslation()
  const { open } = useBittensorClaimModal()
  const token = useToken(tokenId)
  const account = useAccountByAddress(address)
  const bittensorNetworkIds = useBittensorNetworkIds()

  const { genericEvent } = useAnalytics()

  // claims are per-validator: only per-hotkey root position tokens can be claimed
  const rootToken = useMemo(
    () =>
      token?.type === "substrate-dtao" &&
      token.netuid === ROOT_NETUID &&
      token.hotkey &&
      bittensorNetworkIds.includes(token.networkId)
        ? token
        : null,
    [token, bittensorNetworkIds]
  )

  const handleClick = useCallback(() => {
    if (!rootToken?.hotkey) return
    open({ networkId: rootToken.networkId, address, hotkey: rootToken.hotkey })
    genericEvent("open bittensor claim modal", { from: "asset details", tokenId })
  }, [address, genericEvent, open, rootToken, tokenId])

  if (!rootToken || !isAccountOwned(account)) return null

  return (
    <button
      className={cn(
        "bg-primary/10 font-light text-primary/80 hover:bg-primary/20 hover:text-primary",
        variant === "small" && "h-10 rounded-sm px-3 text-xs",
        variant === "large" && "h-14 rounded px-4 text-sm",
        className
      )}
      type="button"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <ZapPlusIcon
          className={cn(
            "shrink-0",
            variant === "small" && "text-xs",
            variant === "large" && "text-base"
          )}
        />
        <div>{t("Claim")}</div>
      </div>
    </button>
  )
}
