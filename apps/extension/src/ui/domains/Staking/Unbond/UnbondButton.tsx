import { TokenId } from "@talismn/chaindata-provider"
import { ExternalLinkIcon, ZapOffIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TALISMAN_WEB_APP_STAKING_POSITIONS_URL } from "extension-shared"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useAnalytics } from "@ui/hooks/useAnalytics"

import { useNomPoolStakingStatus } from "../hooks/nomPools/useNomPoolStakingStatus"
import { useUnbondModal } from "./useUnbondModal"

export const UnbondButton: FC<{
  tokenId: TokenId
  address: string
  className?: string
  variant: "small" | "large"
  poolId: number | string | undefined
  isExternalUnbond: boolean
}> = ({ tokenId, address, className, variant, poolId, isExternalUnbond }) => {
  const { t } = useTranslation()
  const { open } = useUnbondModal()
  const { data: stakingStatus } = useNomPoolStakingStatus(tokenId)

  const { genericEvent } = useAnalytics()

  const canUnstake = useMemo(
    () =>
      !!stakingStatus?.accounts.find((s) => s.address === address && s.canUnstake) ||
      tokenId === "bittensor-substrate-native",
    [address, stakingStatus?.accounts, tokenId],
  )

  const handleClick = useCallback(() => {
    if (isExternalUnbond) {
      window.open(TALISMAN_WEB_APP_STAKING_POSITIONS_URL, "_blank")
      return
    }
    open({ tokenId, address, poolId })
    genericEvent("open inline unbonding modal", { from: "asset details", tokenId })
  }, [address, genericEvent, isExternalUnbond, open, poolId, tokenId])

  if (!canUnstake) return null // no nompool/tao staking on this network

  return (
    <button
      className={classNames(
        "bg-body/10 hover:bg-body/20 text-body-secondary hover:text-body font-light",
        variant === "small" && "h-10 rounded-sm px-3 text-xs",
        variant === "large" && "h-14 rounded px-4 text-sm",
        className,
      )}
      type="button"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        {isExternalUnbond ? (
          <ExternalLinkIcon
            className={classNames(
              "shrink-0",
              variant === "small" && "text-xs",
              variant === "large" && "text-base",
            )}
          />
        ) : (
          <ZapOffIcon
            className={classNames(
              "shrink-0",
              variant === "small" && "text-xs",
              variant === "large" && "text-base",
            )}
          />
        )}
        <div>{t("Unbond")}</div>
      </div>
    </button>
  )
}
