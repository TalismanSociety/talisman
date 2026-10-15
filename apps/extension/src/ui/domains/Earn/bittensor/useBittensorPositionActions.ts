import { api } from "@ui/api"
import { useBittensorClaimModal } from "@ui/domains/Staking/Bittensor/BittensorClaimModal/hooks/useBittensorClaimModal"
import { useBittensorBondModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondModal"
import { useBittensorChangeLockHotkeyModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorChangeLockHotkeyModal"
import { useBittensorChangeLockTypeModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorChangeLockTypeModal"
import { useBittensorChangeValidatorModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorChangeValidatorModal"
import { useBittensorConvictionLockModal } from "@ui/domains/Staking/Bittensor/hooks/useBittensorConvictionLockModal"
import { getTaoDashboardUrl } from "@ui/domains/TaoDashboard/shared/util"
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

export const useBittensorPositionActions = () => {
  const { open: openBond } = useBittensorBondModal()
  const { open: openChangeValidator } = useBittensorChangeValidatorModal()
  const { open: openClaim } = useBittensorClaimModal()
  const { open: openConvictionLock } = useBittensorConvictionLockModal()
  const { open: openChangeLockType } = useBittensorChangeLockTypeModal()
  const { open: openChangeLockHotkey } = useBittensorChangeLockHotkeyModal()
  const navigate = useNavigateWithQuery()

  return useCallback(
    (position: BittensorStakePosition): BittensorPositionActions => {
      const { networkId, netuid, hotkey, address, tokenId, canSign } = position
      const hasStake = position.stake > 0n
      const hasConvictionLock = position.lock?.kind === "conviction-lock"

      const action = (isAvailable: boolean, open: () => void): BittensorPositionAction => ({
        isAvailable,
        run: () => {
          if (isAvailable) open()
        },
      })

      return {
        stake: action(canSign, () =>
          openBond({ entry: "earn", stakeDirection: "bond", networkId, netuid, address, hotkey })
        ),
        unstake: action(canSign && hasStake, () =>
          openBond({ entry: "earn", stakeDirection: "unbond", networkId, netuid, address, hotkey })
        ),
        changeValidator: action(canSign && hasStake, () =>
          openChangeValidator({ entry: "earn", tokenId, address })
        ),
        claim: action(canSign && position.kind === "root" && position.claimable > 0n, () =>
          openClaim({ entry: "earn", networkId, address, hotkey })
        ),
        createLock: action(canSign && position.kind === "subnet" && hasStake, () =>
          openConvictionLock({ entry: "earn", networkId, netuid, address, hotkey })
        ),
        changeLockType: action(canSign && hasConvictionLock, () =>
          openChangeLockType({ entry: "earn", networkId, netuid, address })
        ),
        changeLockHotkey: action(canSign && hasConvictionLock, () =>
          openChangeLockHotkey({ entry: "earn", networkId, netuid, address })
        ),
        viewDetails: action(true, () => {
          const url = getTaoDashboardUrl(networkId, position.kind === "subnet" ? netuid : undefined)
          if (IS_POPUP) api.dashboardOpen(url)
          else navigate(url)
        }),
      }
    },
    [
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
