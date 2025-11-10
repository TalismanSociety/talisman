import { Balances } from "@talismn/balances"
import { SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { SettingsIcon } from "@talismn/icons"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useBittensorBondModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondModal"
import { BittensorStakingWizardOpenOptions } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondWizard"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccounts, useToken } from "@ui/state"
import { useBittensorNetworkIds } from "@ui/state/bittensor"

import { PortfolioToolbarButton } from "../PortfolioToolbarButton"

const ROOT_TOKEN_ID = "bittensor:substrate-dtao:0:5Gq2gs4ft5dhhjbHabvVbAhjMCV2RgKmVJKAFCUWiirbRT21"

export const BittensorClaimSettingsToolbarButton: FC<{
  balances: Balances
  className?: string
}> = ({ balances }) => {
  const { t } = useTranslation()
  const accounts = useAccounts("owned")
  const bittensorNetworkIds = useBittensorNetworkIds()
  const { open: openBittensorModal } = useBittensorBondModal()
  const { genericEvent } = useAnalytics()
  const token = useToken(ROOT_TOKEN_ID) as SubDTaoToken

  const openArgs = useMemo<BittensorStakingWizardOpenOptions | null>(() => {
    const balance = balances.each
      .filter(
        (b) =>
          b.token?.type === "substrate-dtao" &&
          bittensorNetworkIds.includes(b.token.networkId) &&
          accounts.some((a) => isAddressEqual(a.address, b.address)),
      )
      .sort((a, b) => (a.free.planck > b.free.planck ? -1 : 1))[0]

    if (!token || !balance) return null

    return {
      networkId: token.networkId,
      address: balance.address,
      netuid: token.netuid,
      hotkey: token.hotkey,
      stakeDirection: "bond",
      step: "claim-settings",
    }
  }, [accounts, balances.each, bittensorNetworkIds, token])

  const handleClick = useCallback(() => {
    if (!openArgs) return
    openBittensorModal(openArgs)
    genericEvent("open bittensor claim settings", { from: "token menu" })
  }, [genericEvent, openArgs, openBittensorModal])

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
