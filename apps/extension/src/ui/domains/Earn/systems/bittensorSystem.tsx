import type { DotNetworkId } from "@talismn/chaindata-provider"
import { BittensorHotkeyAvatar } from "@ui/domains/Staking/Bittensor/components/BittensorHotkeyAvatar"
import { useBittensorBondModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondModal"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { isBittensorDefiPosition, toEarnPosition } from "../bittensor/bittensorStakePosition"
import { useBittensorPositionActions } from "../bittensor/useBittensorPositionActions"
import { useBittensorPositionsApy } from "../bittensor/useBittensorPositionsApy"
import { useBittensorStakePositions } from "../bittensor/useBittensorStakePositions"
import type {
  EarnActionOpener,
  EarnSystem,
  EarnSystemOpportunitiesResult,
  EarnSystemPositionsResult,
  EarnSystemProvidersResult,
} from "./types"

const EMPTY_OPPORTUNITIES: EarnSystemOpportunitiesResult = { status: "success", byTokenId: {} }
const EMPTY_PROVIDERS: EarnSystemProvidersResult = { status: "success", providers: [] }

// "success" always: balances are a cache-first stream the list already gates on, and a late APY
// must not blank the aggregated list
const usePositions = (): EarnSystemPositionsResult => {
  const { t } = useTranslation()
  const positions = useBittensorStakePositions()
  const getApy = useBittensorPositionsApy(positions)
  const getActions = useBittensorPositionActions()

  return useMemo(
    () => ({
      status: "success",
      positions: positions.map((position) => {
        const { claim } = getActions(position)
        return toEarnPosition({
          position,
          apy: getApy(position),
          rowAction: claim.isAvailable
            ? { kind: "claim", label: t("Claim"), onClick: claim.run }
            : null,
          subtitleIcon: <BittensorHotkeyAvatar hotkey={position.hotkey} />,
          t,
        })
      }),
      isDuplicateDefiPosition: isBittensorDefiPosition,
    }),
    [positions, getApy, getActions, t]
  )
}

const useActionOpener = () => {
  const { open } = useBittensorBondModal()
  return useCallback<EarnActionOpener>(
    (opportunity) =>
      open({
        entry: "earn",
        stakeDirection: "bond",
        networkId: opportunity.networkId as DotNetworkId,
      }),
    [open]
  )
}

export const bittensorSystem: EarnSystem = {
  id: "bittensor",
  useOpportunities: () => EMPTY_OPPORTUNITIES,
  useProviders: () => EMPTY_PROVIDERS,
  usePositions,
  useActionOpener,
}
