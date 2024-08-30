import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useAnalytics } from "@ui/hooks/useAnalytics"

import { useNomPoolWithdrawModal } from "./NomPoolWithdraw/useNomPoolWithdrawModal"
import { useNomPoolStakingStatus } from "./useNomPoolStakingStatus"

export const NomPoolWithdrawButton: FC<{
  tokenId: TokenId
  address: string
  className?: string
}> = ({ tokenId, address, className }) => {
  const { t } = useTranslation()
  const { open } = useNomPoolWithdrawModal()
  const { data: stakingStatus } = useNomPoolStakingStatus(tokenId)

  const { genericEvent } = useAnalytics()

  const canWithdraw = useMemo(
    () => !!stakingStatus?.accounts.find((s) => s.address === address && s.canWithdraw),
    [address, stakingStatus]
  )

  const handleClick = useCallback(() => {
    open({ tokenId, address })
    genericEvent("open inline staking withdraw modal", { from: "asset details", tokenId })
  }, [address, genericEvent, open, tokenId])

  if (!canWithdraw) return null // no nompool staking on this network

  return (
    <button
      type="button"
      onClick={handleClick}
      className={classNames(
        "bg-body/10 hover:bg-body/20 text-body-secondary hover:text-body rounded-xs px-4 py-1",
        className
      )}
    >
      {t("Withdraw")}
    </button>
  )
}
