import { Balances } from "@talismn/balances"
import { SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { SettingsIcon } from "@talismn/icons"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useBittensorClaimSettingsModal } from "@ui/domains/Staking/Bittensor/BittensorClaimSettingsModal/hooks/useBittensorClaimSettingsModal"
import { BittensorClaimSettingsOpenOptions } from "@ui/domains/Staking/Bittensor/BittensorClaimSettingsModal/hooks/useBittensorClaimSettingsWizard"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccounts } from "@ui/state"
import { useBittensorNetworkIds } from "@ui/state/bittensor"

import { PortfolioToolbarButton } from "../PortfolioToolbarButton"

export const BittensorClaimSettingsToolbarButton: FC<{
  balances: Balances
  className?: string
}> = ({ balances }) => {
  const { t } = useTranslation()
  const accounts = useAccounts("owned")
  const bittensorNetworkIds = useBittensorNetworkIds()
  const { open: openBittensorClaimSettingsModal } = useBittensorClaimSettingsModal()
  const { genericEvent } = useAnalytics()

  const openArgs = useMemo<BittensorClaimSettingsOpenOptions | null>(() => {
    const balance = balances.each
      .filter(
        (b) =>
          b.token?.type === "substrate-dtao" &&
          b.token.netuid === ROOT_NETUID &&
          bittensorNetworkIds.includes(b.token.networkId) &&
          accounts.some((a) => isAddressEqual(a.address, b.address)),
      )
      .sort((a, b) => (a.free.planck > b.free.planck ? -1 : 1))[0]

    const token = balance?.token as SubDTaoToken

    if (!token || !balance) {
      return null
    }

    return {
      address: balance.address,
      step: "claim-settings",
    }
  }, [accounts, balances, bittensorNetworkIds])

  const handleClick = useCallback(() => {
    if (!openArgs) return
    openBittensorClaimSettingsModal(openArgs)
    genericEvent("open bittensor claim settings", { from: "token menu" })
  }, [genericEvent, openArgs, openBittensorClaimSettingsModal])

  if (!openArgs) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PortfolioToolbarButton onClick={handleClick}>
          <SettingsIcon />
        </PortfolioToolbarButton>
      </TooltipTrigger>
      <TooltipContent>{t("Root stake claim settings")}</TooltipContent>
    </Tooltip>
  )
}
