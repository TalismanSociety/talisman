import { BITTENSOR_NETWORK_ID } from "@core/domains/bittensor/exports"
import type { DTaoClaimTarget } from "@talismn/balances"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import type { Hex } from "viem"

import { useBittensorBasketPayout } from "../../hooks/useBittensorBasketPayout"
import { useBittensorClaimablePlancks } from "../../hooks/useBittensorClaimablePlancks"
import { useBittensorClaimCandidates } from "../../hooks/useBittensorClaimCandidates"
import { useBittensorClaimPayload } from "../../hooks/useBittensorClaimPayload"
import { useSubtensorStorageBigInt } from "../../hooks/useSubtensorStorageBigInt"
import { getBittensorClaimGate } from "../../utils/claimGate"
import { ROOT_NETUID } from "../../utils/constants"
import { getBlockTimeMs } from "../../utils/helpers"
import { useBittensorClaimModal } from "./useBittensorClaimModal"

type WizardState = {
  /** the claim must never retarget silently: only the position picker can change this */
  target: DTaoClaimTarget | null
  hash: Hex | null
}

const useBittensorClaimWizardProvider = () => {
  const { args } = useBittensorClaimModal()

  // when opened without a full target the user picks the position in the modal
  const isTargetExplicit = !!(args?.address && args?.hotkey)

  const [{ target, hash }, setWizardState] = useState<WizardState>(() => ({
    target:
      args?.address && args?.hotkey
        ? { networkId: args.networkId, address: args.address, hotkey: args.hotkey }
        : null,
    hash: null,
  }))

  const networkId = args?.networkId ?? BITTENSOR_NETWORK_ID

  const candidates = useBittensorClaimCandidates(networkId, args?.addresses)

  const selectTarget = useCallback((newTarget: DTaoClaimTarget) => {
    setWizardState((prev) => ({ ...prev, target: newTarget }))
  }, [])

  const backToPicker = useCallback(() => {
    setWizardState((prev) => ({ ...prev, target: null }))
  }, [])
  const nativeTokenId = useMemo(() => subNativeTokenId(networkId), [networkId])
  const nativeToken = useToken(nativeTokenId, "substrate-native")

  const account = useAccountByAddress(target?.address)

  const { data: sapi } = useScaleApi(networkId)

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

  const {
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
  } = useBittensorClaimPayload({
    networkId: nativeToken?.networkId,
    address: target?.address,
    hotkey: target?.hotkey ?? null,
    enabled: canSubmit,
  })

  const onSubmitted = useCallback((txHash?: Hex) => {
    if (txHash) setWizardState((prev) => ({ ...prev, hash: txHash }))
  }, [])

  return {
    networkId,
    hash,
    target,
    isTargetExplicit,
    candidates,
    selectTarget,
    backToPicker,
    account,
    hotkey: target?.hotkey ?? null,
    nativeToken,
    claimablePlancks,
    dustThreshold,
    isClaimUnavailable,
    isBelowDustThreshold,
    holdDurationMs,
    canSubmit,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
    onSubmitted,
  }
}

export const [BittensorClaimWizardProvider, useBittensorClaimWizard] = provideContext(
  useBittensorClaimWizardProvider
)
