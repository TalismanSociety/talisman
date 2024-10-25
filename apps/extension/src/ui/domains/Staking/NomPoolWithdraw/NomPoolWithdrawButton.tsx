import { TokenId } from "@talismn/chaindata-provider"
import { ZapMinusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useAnalytics } from "@ui/hooks/useAnalytics"

import { useNomPoolStakingStatus } from "../shared/useNomPoolStakingStatus"
import { useNomPoolWithdrawModal } from "./useNomPoolWithdrawModal"

export const NomPoolWithdrawButton: FC<{
  tokenId: TokenId
  address: string
  className?: string
  variant: "small" | "large"
}> = ({ tokenId, address, variant, className }) => {
  const { t } = useTranslation()
  const { open } = useNomPoolWithdrawModal()
  const { data: stakingStatus } = useNomPoolStakingStatus(tokenId)

  const { genericEvent } = useAnalytics()

  const canWithdraw = useMemo(
    () => !!stakingStatus?.accounts.find((s) => s.address === address && s.canWithdraw),
    [address, stakingStatus],
  )

  const handleClick = useCallback(() => {
    open({ tokenId, address })
    genericEvent("open inline staking withdraw modal", { from: "asset details", tokenId })
  }, [address, genericEvent, open, tokenId])

  if (!canWithdraw) return null // no nompool staking on this network

  return (
    <button
      className={classNames(
        "text-primary/80 hover:text-primary bg-primary/10 hover:bg-primary/20 font-light",
        variant === "small" && "h-10 rounded-sm px-3 text-xs",
        variant === "large" && "h-14 rounded px-4 text-sm",
        className,
      )}
      type="button"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <ZapMinusIcon
          className={classNames(
            "shrink-0",
            variant === "small" && "text-xs",
            variant === "large" && "text-base",
          )}
        />
        <div>{t("Withdraw")}</div>
      </div>
    </button>
  )
}
