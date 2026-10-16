import { isAccountOwned } from "@core/domains/keyring/exports"
import type { TokenId } from "@talismn/chaindata-provider"
import { ZapMinusIcon } from "@talismn/icons"
import { useAccountByAddress } from "@ui/state/accounts"
import { cn } from "@ui/util/cn"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { useEvmMirrorWithdrawModal } from "./useEvmMirrorWithdrawModal"

export const EvmMirrorWithdrawButton: FC<{
  tokenId: TokenId
  address: string
  variant: "small" | "large"
}> = ({ tokenId, address, variant }) => {
  const { t } = useTranslation()
  const { open } = useEvmMirrorWithdrawModal()
  const account = useAccountByAddress(address)

  const handleClick = useCallback(() => {
    open({ tokenId, address })
  }, [address, open, tokenId])

  if (!isAccountOwned(account)) return null

  return (
    <button
      className={cn(
        "bg-primary/10 font-light text-primary/80 hover:bg-primary/20 hover:text-primary",
        variant === "small" && "h-10 rounded-sm px-3 text-xs",
        variant === "large" && "h-14 rounded px-4 text-sm"
      )}
      type="button"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <ZapMinusIcon
          className={cn(
            "shrink-0",
            variant === "small" && "text-xs",
            variant === "large" && "text-base"
          )}
        />
        <div>{t("Withdraw")}</div>
      </div>
    </button>
  )
}
