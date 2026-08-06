import { BITTENSOR_NETWORK_ID } from "@core/domains/bittensor/exports"
import type { DTaoClaimTarget } from "@talismn/balances"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useBalances } from "@ui/state/balances"
import { useToken } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import type { Hex } from "viem"

import { useBittensorClaimCandidates } from "../../hooks/useBittensorClaimCandidates"
import { useBittensorClaimPayload } from "../../hooks/useBittensorClaimPayload"
import { useBittensorFeeError } from "../../hooks/useBittensorFeeError"
import { useBittensorRootClaimGate } from "../../hooks/useBittensorRootClaimGate"
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

  const { data: sapi } = useScaleApi(networkId)

  const {
    account,
    claimablePlancks,
    dustThreshold,
    isClaimUnavailable,
    isBelowDustThreshold,
    canSubmit,
    holdDurationMs,
  } = useBittensorRootClaimGate(sapi, target)

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

  // the claimed TAO is staked back onto root, but the fee is paid from free balance:
  // an account with all its TAO staked cannot afford the claim
  const allBalances = useBalances("owned")
  const feeErrorMessage = useBittensorFeeError({
    allBalances,
    address: target?.address ?? null,
    feeEstimate,
    feeTokenId: nativeTokenId,
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
    feeErrorMessage,
    // fail closed while the fee estimate is unresolved: without it the affordability
    // check cannot run, and an account with no spendable TAO could reach confirmation
    payload: feeErrorMessage || typeof feeEstimate !== "bigint" ? undefined : payload,
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
