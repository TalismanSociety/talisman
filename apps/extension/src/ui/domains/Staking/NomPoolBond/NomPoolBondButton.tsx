import { TokenId } from "@talismn/chaindata-provider"
import { ZapIcon, ZapPlusIcon } from "@talismn/icons"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useAnalytics } from "@ui/hooks/useAnalytics"

import { useNomPoolStakingStatus } from "../shared/useNomPoolStakingStatus"
import { useNomPoolBondModal } from "./useNomPoolBondModal"

export const NomPoolBondButton: FC<{ tokenId: TokenId }> = ({ tokenId }) => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const { open } = useNomPoolBondModal()
  const { data: stakingStatus } = useNomPoolStakingStatus(tokenId)

  const [openArgs, isNomPoolStaking] = useMemo<
    [Parameters<typeof open>[0] | undefined, boolean | undefined]
  >(() => {
    if (!stakingStatus) return [undefined, undefined]
    const { accounts, poolId } = stakingStatus
    const acc = accounts?.find((s) => s.canBondNomPool)
    if (!acc) return [undefined, undefined]
    return [
      {
        tokenId,
        address: acc.address,
        poolId: acc.poolId ?? poolId,
      },
      !!acc.isNomPoolsStaking,
    ]
  }, [stakingStatus, tokenId])

  const handleClick = useCallback(() => {
    if (!openArgs) return
    open(openArgs)
    genericEvent("open inline staking modal", { tokenId: openArgs.tokenId })
  }, [genericEvent, open, openArgs])

  if (!openArgs) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className="text-primary bg-primary/10 hover:bg-primary/20 flex size-[3.8rem] shrink-0 items-center justify-center rounded-full text-[2rem]"
        >
          {isNomPoolStaking ? <ZapPlusIcon /> : <ZapIcon />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("Stake")}</TooltipContent>
    </Tooltip>
  )
}
