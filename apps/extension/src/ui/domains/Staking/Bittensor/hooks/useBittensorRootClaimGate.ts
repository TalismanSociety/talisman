import type { DTaoClaimTarget } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"
import { useAccountByAddress } from "@ui/state/accounts"
import { useMemo } from "react"

import { getBittensorClaimGate, rootClaimThresholdToPlancks } from "../utils/claimGate"
import { ROOT_NETUID } from "../utils/constants"
import { getBlockTimeMs } from "../utils/helpers"
import { useBittensorBasketClaimPreview } from "./useBittensorBasketClaimPreview"
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
  // balances stream only seeding the display until it settles.
  // Readiness requires a fetch completed for THIS mount: a preview cached from a previous
  // modal open (eg right after claiming) would otherwise open the gate on an entitlement
  // that is already gone and let the user pay a fee for a no-op
  const streamedClaimablePlancks = useBittensorClaimablePlancks(target)
  const previewQuery = useBittensorBasketClaimPreview(sapi, target)
  const isFreshPreviewReady = previewQuery.isSuccess && previewQuery.isFetchedAfterMount
  const freshPreview = previewQuery.data

  // claims below RootClaimableThreshold[ROOT] are skipped on-chain as dust: block them
  // instead of letting the user pay a fee for a no-op.
  // Same readiness rule: a value cached from a previous modal open could hide an on-chain
  // change (e.g. the hold window being enabled) and let the gate build a transaction the
  // chain now rejects.
  const dustThresholdQuery = useSubtensorStorageBigInt(sapi, "RootClaimableThreshold", [
    ROOT_NETUID,
  ])
  const isDustThresholdReady =
    dustThresholdQuery.isSuccess && dustThresholdQuery.isFetchedAfterMount
  const dustThreshold = rootClaimThresholdToPlancks(dustThresholdQuery.data ?? 0n)

  // claiming counts as a root stake op: when the hold window is enabled it restarts for
  // the claimed pair, so the user must be warned before confirming
  const holdIntervalQuery = useSubtensorStorageBigInt(sapi, "RootStakeUnlockInterval")
  const isHoldIntervalReady = holdIntervalQuery.isSuccess && holdIntervalQuery.isFetchedAfterMount
  const holdIntervalBlocks = holdIntervalQuery.data ?? 0n

  const holdDurationMs = useMemo(
    () =>
      sapi && holdIntervalBlocks > 0n ? Number(holdIntervalBlocks) * getBlockTimeMs(sapi) : null,
    [sapi, holdIntervalBlocks]
  )

  const {
    claimablePlancks,
    forfeitedPlancks,
    dustRows,
    isClaimUnavailable,
    isBelowDustThreshold,
    canSubmit,
  } = getBittensorClaimGate({
    hasAccount: !!account,
    streamedClaimablePlancks,
    freshPreview,
    isFreshPreviewReady,
    dustThreshold,
    isDustThresholdReady,
    isHoldIntervalReady,
  })

  return {
    account,
    claimablePlancks,
    forfeitedPlancks,
    dustRows,
    dustThreshold,
    isClaimUnavailable,
    isBelowDustThreshold,
    canSubmit,
    holdDurationMs,
    holdIntervalBlocks,
    isHoldIntervalReady,
  }
}
