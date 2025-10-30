import { Balances } from "@talismn/balances"
import { SubDTaoToken } from "@talismn/chaindata-provider"
import { ZapOffIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useBittensorBondModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondModal"
import { BittensorStakingWizardOpenOptions } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondWizard"
import { useBittensorNetworkIds } from "@ui/state/bittensor"

export const BittensorUnstakeButton: FC<{ balances: Balances; className?: string }> = ({
  balances,
  className,
}) => {
  const { t } = useTranslation()
  const { open } = useBittensorBondModal()
  const bittensorNetworkIds = useBittensorNetworkIds()

  const openArgs = useMemo<BittensorStakingWizardOpenOptions | null>(() => {
    const balance = balances.each
      .filter(
        (b) =>
          b.token?.type === "substrate-dtao" && bittensorNetworkIds.includes(b.token.networkId),
      )
      .sort((a, b) => (a.free.planck > b.free.planck ? -1 : 1))[0]

    const token = balance?.token as SubDTaoToken

    return balance && token
      ? {
          networkId: token.networkId,
          address: balance.address,
          netuid: token.netuid,
          hotkey: token.hotkey,
          stakeDirection: "unbond",
        }
      : null
  }, [balances.each, bittensorNetworkIds])

  const handleClick = useCallback(() => {
    if (!openArgs) return
    open(openArgs)
  }, [open, openArgs])

  if (!openArgs) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "text-body-secondary hover:text-body focus:text-body focus:bg-grey-700 hover:bg-grey-700 rounded-xs inline-flex h-9 w-9 items-center justify-center text-xs",
            className,
          )}
        >
          <ZapOffIcon />
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("Unstake")}</TooltipContent>
    </Tooltip>
  )
}
