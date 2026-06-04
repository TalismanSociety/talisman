import type { Balances } from "@talismn/balances"
import type { SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { LockIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import {
  type BittensorConvictionLockModalArgs,
  useBittensorConvictionLockModal,
} from "@ui/domains/Staking/Bittensor/hooks/useBittensorConvictionLockModal"
import { useAccounts } from "@ui/state/accounts"
import { useBittensorNetworkIds } from "@ui/state/bittensor"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { PortfolioToolbarButton } from "../PortfolioToolbarButton"

export const BittensorConvictionLockToolbarButton: FC<{
  balances: Balances
  className?: string
}> = ({ balances, className }) => {
  const { t } = useTranslation()
  const { open } = useBittensorConvictionLockModal()
  const bittensorNetworkIds = useBittensorNetworkIds()
  const accounts = useAccounts("owned")

  const openArgs = useMemo<BittensorConvictionLockModalArgs | null>(() => {
    // conviction locks only exist on real subnets (netuid > 0) and require already-staked alpha
    const balance = balances.each
      .filter(
        (b) =>
          b.token?.type === "substrate-dtao" &&
          bittensorNetworkIds.includes(b.networkId) &&
          !!(b.token as SubDTaoToken).netuid &&
          b.free.planck > 0n &&
          accounts.some((a) => isAddressEqual(a.address, b.address))
      )
      .sort((a, b) => (a.free.planck > b.free.planck ? -1 : 1))[0]

    const token = balance?.token as SubDTaoToken | undefined

    return balance && token
      ? {
          networkId: token.networkId,
          netuid: token.netuid,
          address: balance.address,
          hotkey: token.hotkey,
        }
      : null
  }, [accounts, balances, bittensorNetworkIds])

  const handleClick = useCallback(() => {
    if (!openArgs) return
    open(openArgs)
  }, [open, openArgs])

  if (!openArgs) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PortfolioToolbarButton onClick={handleClick} className={className}>
          <LockIcon />
        </PortfolioToolbarButton>
      </TooltipTrigger>
      <TooltipContent>{t("Create conviction lock")}</TooltipContent>
    </Tooltip>
  )
}
