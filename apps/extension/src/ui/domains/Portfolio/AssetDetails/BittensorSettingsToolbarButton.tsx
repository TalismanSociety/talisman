import type { Balances } from "@talismn/balances"
import type { SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { SettingsIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useBittensorSettingsModal } from "@ui/domains/Staking/Bittensor/BittensorSettingsModal/hooks/useBittensorSettingsModal"
import type { BittensorSettingsOpenOptions } from "@ui/domains/Staking/Bittensor/BittensorSettingsModal/hooks/useBittensorSettingsWizard"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccounts } from "@ui/state/accounts"
import { useBittensorNetworkIds } from "@ui/state/bittensor"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { PortfolioToolbarButton } from "../PortfolioToolbarButton"

export const BittensorSettingsToolbarButton: FC<{
  balances: Balances
  className?: string
}> = ({ balances }) => {
  const { t } = useTranslation()
  const accounts = useAccounts("owned")
  const bittensorNetworkIds = useBittensorNetworkIds()
  const { open: openBittensorSettingsModal } = useBittensorSettingsModal()
  const { genericEvent } = useAnalytics()

  const openArgs = useMemo<BittensorSettingsOpenOptions | null>(() => {
    const balance = balances.each
      .filter(
        (b) =>
          bittensorNetworkIds.includes(b.networkId) &&
          accounts.some((a) => isAddressEqual(a.address, b.address))
      )
      .sort((a, b) => (a.free.planck > b.free.planck ? -1 : 1))[0]

    const token = balance?.token as SubDTaoToken

    if (!token || !balance) {
      return null
    }

    return {
      address: balance.address,
      step: "settings",
    }
  }, [accounts, balances, bittensorNetworkIds])

  const handleClick = useCallback(() => {
    if (!openArgs) return
    openBittensorSettingsModal(openArgs)
    genericEvent("open bittensor settings", { from: "token menu" })
  }, [genericEvent, openArgs, openBittensorSettingsModal])

  if (!openArgs) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PortfolioToolbarButton onClick={handleClick}>
          <SettingsIcon />
        </PortfolioToolbarButton>
      </TooltipTrigger>
      <TooltipContent>{t("Bittensor settings")}</TooltipContent>
    </Tooltip>
  )
}
