import type { DTaoClaimTarget } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"
import { useAccountByAddress } from "@ui/state/accounts"
import { useMemo } from "react"

import { getBittensorClaimGate } from "../utils/claimGate"
import { ROOT_NETUID } from "../utils/constants"
import { getBlockTimeMs } from "../utils/helpers"
import { useBittensorBasketPayout } from "./useBittensorBasketPayout"
import { useBittensorClaimablePlancks } from "./useBittensorClaimablePlancks"
import { useSubtensorStorageBigInt } from "./useSubtensorStorageBigInt"

/**
 * Assembles every chain read the root rewards claim gate depends on for a
 * (coldkey, hotkey) pair and resolves them through {@link getBittensorClaimGate}.
 * With a null target everything stays disabled and the gate fails closed.
 */
export const useBittensorRootClaimGate = (
  sapi: ScaleApi | null | undefined,
  target: DTaoClaimTarget | null
) => {
  const account = useAccountByAddress(target?.address)

  // the entitlement can shrink or disappear while the modal is open (NAV drift, or claimed
  // from another device): submission gates on a fresh per-block chain read, with the cached
  // balances stream only seeding the display until it settles
  const streamedClaimablePlancks = useBittensorClaimablePlancks(target)
  const { data: freshPayoutPlancks, isSuccess: isFreshPayoutReady } = useBittensorBasketPayout(
    sapi,
    target
  )

  // claims below RootClaimableThreshold[ROOT] are skipped on-chain as dust: block them
  // instead of letting the user pay a fee for a no-op
  const { data: rawDustThreshold, isSuccess: isDustThresholdReady } = useSubtensorStorageBigInt(
    sapi,
    "RootClaimableThreshold",
    [ROOT_NETUID]
  )
  const dustThreshold = rawDustThreshold ?? 0n

  // claiming counts as a root stake op: when the hold window is enabled it restarts for
  // the claimed pair, so the user must be warned before confirming
  const { data: rawHoldInterval, isSuccess: isHoldIntervalReady } = useSubtensorStorageBigInt(
    sapi,
    "RootStakeUnlockInterval"
  )
  const holdIntervalBlocks = rawHoldInterval ?? 0n

  const holdDurationMs = useMemo(
    () =>
      sapi && holdIntervalBlocks > 0n ? Number(holdIntervalBlocks) * getBlockTimeMs(sapi) : null,
    [sapi, holdIntervalBlocks]
  )

  const { claimablePlancks, isClaimUnavailable, isBelowDustThreshold, canSubmit } =
    getBittensorClaimGate({
      hasAccount: !!account,
      streamedClaimablePlancks,
      freshPayoutPlancks,
      isFreshPayoutReady,
      dustThreshold,
      isDustThresholdReady,
      isHoldIntervalReady,
    })

  return {
    account,
    claimablePlancks,
    dustThreshold,
    isClaimUnavailable,
    isBelowDustThreshold,
    canSubmit,
    holdDurationMs,
  }
}
