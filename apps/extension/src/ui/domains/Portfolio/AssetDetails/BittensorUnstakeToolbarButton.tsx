import type { Balances } from "@talismn/balances"
import type { SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { ZapOffIcon } from "@talismn/icons"
import { useBittensorBondModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondModal"
import type { BittensorStakingWizardOpenOptions } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondWizard"
import { useAccounts } from "@ui/state"
import { useBittensorNetworkIds } from "@ui/state/bittensor"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { PortfolioToolbarButton } from "../PortfolioToolbarButton"

export const BittensorUnstakeToolbarButton: FC<{ balances: Balances; className?: string }> = ({
  balances,
  className,
}) => {
  const { t } = useTranslation()
  const { open } = useBittensorBondModal()
  const bittensorNetworkIds = useBittensorNetworkIds()
  const accounts = useAccounts("owned")

  const openArgs = useMemo<BittensorStakingWizardOpenOptions | null>(() => {
    const balance = balances.each
      .filter(
        (b) =>
          bittensorNetworkIds.includes(b.networkId) &&
          accounts.some((a) => isAddressEqual(a.address, b.address))
      )
      .sort((a, b) => (a.free.planck > b.free.planck ? -1 : 1))[0]

    const token = balance?.token as SubDTaoToken

    return balance && token
      ? {
          networkId: token.networkId,
          stakeDirection: "unbond",
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
          <ZapOffIcon />
        </PortfolioToolbarButton>
      </TooltipTrigger>
      <TooltipContent>{t("Unstake")}</TooltipContent>
    </Tooltip>
  )
}
