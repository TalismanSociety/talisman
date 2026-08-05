import type { Balances } from "@talismn/balances"
import { CoinsHandIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useBittensorClaimModal } from "@ui/domains/Staking/Bittensor/BittensorClaimModal/hooks/useBittensorClaimModal"
import {
  type BittensorClaimTarget,
  getBiggestBittensorClaim,
} from "@ui/domains/Staking/Bittensor/utils/claimableRewards"
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

  // opens the biggest claim: this entry point has no position context to claim from
  const openArgs = useMemo<BittensorClaimTarget | null>(() => {
    const biggestClaim = getBiggestBittensorClaim(
      balances.each,
      accounts.map((a) => a.address),
      bittensorNetworkIds
    )
    if (!biggestClaim?.token.hotkey) return null

    return {
      networkId: biggestClaim.token.networkId,
      address: biggestClaim.balance.address,
      hotkey: biggestClaim.token.hotkey,
    }
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
