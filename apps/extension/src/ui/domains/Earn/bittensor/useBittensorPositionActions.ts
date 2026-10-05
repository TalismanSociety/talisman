import { api } from "@ui/api"
import { useBittensorClaimModal } from "@ui/domains/Staking/Bittensor/BittensorClaimModal/hooks/useBittensorClaimModal"
import { useBittensorBondModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondModal"
import { useBittensorChangeLockHotkeyModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorChangeLockHotkeyModal"
import { useBittensorChangeLockTypeModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorChangeLockTypeModal"
import { useBittensorChangeValidatorModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorChangeValidatorModal"
import { useBittensorConvictionLockModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorConvictionLockModal"
import { getTaoDashboardUrl } from "@ui/domains/TaoDashboard/shared/util"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { IS_POPUP } from "@ui/util/constants"
import { useCallback } from "react"

import type { BittensorStakePosition } from "./bittensorStakePosition"

type BittensorPositionAction = { isAvailable: boolean; run: () => void }

export type BittensorPositionActions = Record<
  | "stake"
  | "unstake"
  | "changeValidator"
  | "claim"
  | "createLock"
  | "changeLockType"
  | "changeLockHotkey"
  | "viewDetails",
  BittensorPositionAction
>

export const useBittensorPositionActions = (from: "earn positions" | "earn position page") => {
  const { open: openBond } = useBittensorBondModal()
  const { open: openChangeValidator } = useBittensorChangeValidatorModal()
  const { open: openClaim } = useBittensorClaimModal()
  const { open: openConvictionLock } = useBittensorConvictionLockModal()
  const { open: openChangeLockType } = useBittensorChangeLockTypeModal()
  const { open: openChangeLockHotkey } = useBittensorChangeLockHotkeyModal()
  const navigate = useNavigateWithQuery()
  const { genericEvent } = useAnalytics()

  return useCallback(
    (position: BittensorStakePosition): BittensorPositionActions => {
      const { networkId, netuid, hotkey, address, tokenId, canSign } = position
      const hasStake = position.stake > 0n
      const hasConvictionLock = position.lock?.kind === "conviction-lock"

      const action = (
        isAvailable: boolean,
        eventName: string,
        open: () => void
      ): BittensorPositionAction => ({
        isAvailable,
        run: () => {
          if (!isAvailable) return
          genericEvent(eventName, { from, tokenId })
          open()
        },
      })

      return {
        stake: action(canSign, "open bittensor stake modal", () =>
          openBond({ stakeDirection: "bond", networkId, netuid, address, hotkey })
        ),
        unstake: action(canSign && hasStake, "open bittensor unstake modal", () =>
          openBond({ stakeDirection: "unbond", networkId, netuid, address, hotkey })
        ),
        changeValidator: action(canSign && hasStake, "open change validator modal", () =>
          openChangeValidator({ tokenId, address })
        ),
        claim: action(
          canSign && position.kind === "root" && position.claimable > 0n,
          "open bittensor claim modal",
          () => openClaim({ networkId, address, hotkey })
        ),
        createLock: action(
          canSign && position.kind === "subnet" && hasStake,
          "open bittensor conviction lock modal",
          () => openConvictionLock({ networkId, netuid, address, hotkey })
        ),
        changeLockType: action(
          canSign && hasConvictionLock,
          "open change conviction lock type modal",
          () => openChangeLockType({ networkId, netuid, address })
        ),
        changeLockHotkey: action(
          canSign && hasConvictionLock,
          "open change conviction lock hotkey modal",
          () => openChangeLockHotkey({ networkId, netuid, address })
        ),
        viewDetails: action(true, "open tao dashboard", () => {
          const url = getTaoDashboardUrl(networkId, position.kind === "subnet" ? netuid : undefined)
          if (IS_POPUP) api.dashboardOpen(url)
          else navigate(url)
        }),
      }
    },
    [
      from,
      genericEvent,
      navigate,
      openBond,
      openChangeValidator,
      openClaim,
      openConvictionLock,
      openChangeLockType,
      openChangeLockHotkey,
    ]
  )
}
