import type { Balances } from "@talismn/balances"
import { isAddressEqual } from "@talismn/crypto"
import { CoinsHandIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useBittensorClaimModal } from "@ui/domains/Staking/Bittensor/BittensorClaimModal/hooks/useBittensorClaimModal"
import type { BittensorClaimOpenOptions } from "@ui/domains/Staking/Bittensor/BittensorClaimModal/hooks/useBittensorClaimWizard"
import { getBalanceClaimablePlancks } from "@ui/domains/Staking/Bittensor/utils/claimableRewards"
import { useAccounts } from "@ui/state/accounts"
import { useBittensorNetworkIds } from "@ui/state/bittensor"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { PortfolioToolbarButton } from "../PortfolioToolbarButton"

export const BittensorClaimToolbarButton: FC<{ balances: Balances; className?: string }> = ({
  balances,
  className,
}) => {
  const { t } = useTranslation()
  const { open } = useBittensorClaimModal()
  const bittensorNetworkIds = useBittensorNetworkIds()
  const accounts = useAccounts("owned")

  // opens the validator selection on the network with the most claimable rewards
  const openArgs = useMemo<BittensorClaimOpenOptions | null>(() => {
    const balance = balances.each
      .filter(
        (b) =>
          bittensorNetworkIds.includes(b.networkId) &&
          accounts.some((a) => isAddressEqual(a.address, b.address)) &&
          b.token?.type === "substrate-dtao" &&
          !!b.token.hotkey &&
          getBalanceClaimablePlancks(b) > 0n
      )
      .sort((a, b) => (getBalanceClaimablePlancks(a) > getBalanceClaimablePlancks(b) ? -1 : 1))[0]

    return balance ? { networkId: balance.networkId } : null
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
          <CoinsHandIcon />
        </PortfolioToolbarButton>
      </TooltipTrigger>
      <TooltipContent>{t("Claim Rewards")}</TooltipContent>
    </Tooltip>
  )
}
