import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useAnalytics } from "@ui/hooks/useAnalytics"

import { useUnstakeModal } from "./Unstake/useUnstakeModal"
import { useNomPoolStakingStatus } from "./useNomPoolStakingStatus"

export const NomPoolUnbondButton: FC<{ tokenId: TokenId; address: string; className?: string }> = ({
  tokenId,
  address,
  className,
}) => {
  const { t } = useTranslation()
  const { open } = useUnstakeModal()
  const { data: stakingStatus } = useNomPoolStakingStatus(tokenId)

  const { genericEvent } = useAnalytics()

  const canUnstake = useMemo(
    () => !!stakingStatus?.accounts.find((s) => s.address === address && s.canUnstake),
    [address, stakingStatus]
  )

  const handleClick = useCallback(() => {
    open({ tokenId, address })
    genericEvent("open inline unbonding modal", { from: "asset details", tokenId })
  }, [address, genericEvent, open, tokenId])

  if (!canUnstake) return null // no nompool staking on this network

  return (
    <button
      type="button"
      onClick={handleClick}
      className={classNames(
        "bg-body/10 hover:bg-body/20 text-body-secondary hover:text-body rounded-xs px-4 py-1",
        className
      )}
    >
      {t("Unbond")}
    </button>
  )
}
