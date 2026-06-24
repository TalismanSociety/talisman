import type { Address } from "@core/types/base"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import type { RootClaimType } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useGetBittensorClaimType } from "@ui/domains/Staking/hooks/bittensor/dTao/useGetBittensorClaimType"
import { useGetBittensorAcceptsLockedAlpha } from "@ui/domains/Staking/hooks/bittensor/useGetBittensorAcceptsLockedAlpha"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BehaviorSubject } from "rxjs"
import type { Hex } from "viem"

import { useBittensorSettingsPayload } from "../../hooks/useBittensorSettingsPayload"
import { BITTENSOR_NETWORK_ID } from "../constants"

export type BittensorSettingsStep = "settings" | "follow-up"

type WizardState = {
  step: BittensorSettingsStep
  address: Address | null
  hash: Hex | null
  selectedClaimType: RootClaimType | null
  selectedSubnets: number[]
  /** target accept-locked-alpha state (spec 421); null until seeded from chain */
  selectedAcceptLockedAlpha: boolean | null
  onSubmittedCallback: (() => void) | null
}

export type BittensorSettingsOpenOptions = {
  address: Address
  step?: BittensorSettingsStep
  onSubmitted?: () => void
}

const DEFAULT_STATE: WizardState = {
  step: "settings",
  address: null,
  hash: null,
  selectedClaimType: null,
  selectedSubnets: [],
  selectedAcceptLockedAlpha: null,
  onSubmittedCallback: null,
}

const wizardOpenState$ = new BehaviorSubject(DEFAULT_STATE)

export const useResetBittensorSettingsWizard = () => {
  const reset = useCallback((init: BittensorSettingsOpenOptions) => {
    wizardOpenState$.next({
      ...DEFAULT_STATE,
      address: init.address,
      step: init.step ?? "settings",
      onSubmittedCallback: init.onSubmitted ?? null,
    })
  }, [])

  return reset
}

const useBittensorSettingsWizardProvider = () => {
  const [
    {
      address,
      step,
      hash,
      selectedClaimType,
      selectedSubnets,
      selectedAcceptLockedAlpha,
      onSubmittedCallback,
    },
    setWizardState,
  ] = useState(() => wizardOpenState$.getValue())

  const nativeTokenId = useMemo(() => subNativeTokenId(BITTENSOR_NETWORK_ID), [])
  const account = useAccountByAddress(address)
  const nativeToken = useToken(nativeTokenId, "substrate-native")
  const accountPicker = useOpenClose()

  // Fetch the current claim type from chain
  const {
    data: claimTypeData,
    isLoading: isClaimTypeLoading,
    isError: isClaimTypeError,
    refetch: refetchClaimType,
  } = useGetBittensorClaimType({
    networkId: nativeToken?.networkId,
    address: account?.address,
  })

  // Fetch the current accept-locked-alpha flag from chain (spec 421); null = unsupported runtime
  const { data: currentAcceptLockedAlpha, isLoading: isAcceptLockedAlphaLoading } =
    useGetBittensorAcceptsLockedAlpha({
      networkId: nativeToken?.networkId,
      address: account?.address,
    })

  // Populate selectedClaimType and selectedSubnets from chain data when it loads
  useEffect(() => {
    if (claimTypeData) {
      setWizardState((prev) => ({
        ...prev,
        selectedClaimType: claimTypeData.claimType,
        selectedSubnets: claimTypeData.subnets ?? prev.selectedSubnets,
      }))
    }
  }, [claimTypeData])

  // Seed the accept-locked-alpha toggle from chain once (don't clobber a user toggle)
  useEffect(() => {
    if (typeof currentAcceptLockedAlpha === "boolean") {
      setWizardState((prev) =>
        prev.selectedAcceptLockedAlpha === null
          ? { ...prev, selectedAcceptLockedAlpha: currentAcceptLockedAlpha }
          : prev
      )
    }
  }, [currentAcceptLockedAlpha])

  // Whether the reward type / its selected subnets differ from chain
  const claimSettingsChanged = useMemo(() => {
    if (!claimTypeData) return false
    if (selectedClaimType !== claimTypeData.claimType) return true
    if (selectedClaimType === "KeepSubnets") {
      const originalSubnets = claimTypeData.subnets ?? []
      if (selectedSubnets.length !== originalSubnets.length) return true
      const sortedSelected = [...selectedSubnets].sort((a, b) => a - b)
      const sortedOriginal = [...originalSubnets].sort((a, b) => a - b)
      return sortedSelected.some((subnet, i) => subnet !== sortedOriginal[i])
    }
    return false
  }, [claimTypeData, selectedClaimType, selectedSubnets])

  // Whether the accept-locked-alpha toggle differs from chain (only when the flag is supported)
  const rejectFlagChanged = useMemo(
    () =>
      typeof currentAcceptLockedAlpha === "boolean" &&
      typeof selectedAcceptLockedAlpha === "boolean" &&
      selectedAcceptLockedAlpha !== currentAcceptLockedAlpha,
    [currentAcceptLockedAlpha, selectedAcceptLockedAlpha]
  )

  const canSubmit = claimSettingsChanged || rejectFlagChanged

  // The combined payload only includes the calls whose value changed (batched when both change)
  const {
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
  } = useBittensorSettingsPayload({
    networkId: nativeToken?.networkId,
    address: account?.address,
    includeClaimSettings: claimSettingsChanged,
    claimType: selectedClaimType,
    selectedSubnets,
    includeRejectFlag: rejectFlagChanged,
    acceptLockedAlpha: selectedAcceptLockedAlpha ?? false,
  })

  const setAddress = useCallback(
    (newAddress: Address) =>
      setWizardState((prev) => ({
        ...prev,
        address: newAddress,
        selectedClaimType: null,
        selectedSubnets: [],
        selectedAcceptLockedAlpha: null,
      })),
    []
  )

  const setStep = useCallback(
    (newStep: BittensorSettingsStep) => setWizardState((prev) => ({ ...prev, step: newStep })),
    []
  )

  const setSelectedClaimType = useCallback(
    (claimType: RootClaimType) =>
      setWizardState((prev) => ({ ...prev, selectedClaimType: claimType })),
    []
  )

  const setSelectedSubnets = useCallback(
    (subnets: number[]) => setWizardState((prev) => ({ ...prev, selectedSubnets: subnets })),
    []
  )

  const setSelectedAcceptLockedAlpha = useCallback(
    (accept: boolean) => setWizardState((prev) => ({ ...prev, selectedAcceptLockedAlpha: accept })),
    []
  )

  const onSubmitted = useCallback(
    (txHash?: Hex) => {
      if (txHash) {
        setWizardState((prev) => ({ ...prev, step: "follow-up", hash: txHash }))
      }
      if (onSubmittedCallback) {
        onSubmittedCallback()
      }
    },
    [onSubmittedCallback]
  )

  return {
    address,
    step,
    hash,
    selectedClaimType,
    selectedSubnets,
    selectedAcceptLockedAlpha,
    currentAcceptLockedAlpha,
    isAcceptLockedAlphaLoading,
    // hide the toggle on runtimes that don't expose the flag (resolves to null once loaded)
    acceptLockedAlphaUnsupported: !isAcceptLockedAlphaLoading && currentAcceptLockedAlpha === null,
    account,
    nativeToken,
    accountPicker,
    claimTypeData,
    isClaimTypeLoading,
    isClaimTypeError,
    refetchClaimType,
    canSubmit,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
    setAddress,
    setStep,
    setSelectedClaimType,
    setSelectedSubnets,
    setSelectedAcceptLockedAlpha,
    onSubmitted,
  }
}

export const [BittensorSettingsWizardProvider, useBittensorSettingsWizard] = provideContext(
  useBittensorSettingsWizardProvider
)
