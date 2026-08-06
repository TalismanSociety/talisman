import type { Address } from "@core/types/base"
import { type DotNetworkId, subNativeTokenId } from "@talismn/chaindata-provider"
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
  networkId: DotNetworkId
  address: Address | null
  hash: Hex | null
  /** target accept-locked-alpha state (spec 421); null until seeded from chain */
  selectedAcceptLockedAlpha: boolean | null
  onSubmittedCallback: (() => void) | null
}

export type BittensorSettingsOpenOptions = {
  networkId: DotNetworkId
  address: Address
  step?: BittensorSettingsStep
  onSubmitted?: () => void
}

const DEFAULT_STATE: WizardState = {
  step: "settings",
  networkId: BITTENSOR_NETWORK_ID,
  address: null,
  hash: null,
  selectedAcceptLockedAlpha: null,
  onSubmittedCallback: null,
}

const wizardOpenState$ = new BehaviorSubject(DEFAULT_STATE)

export const useResetBittensorSettingsWizard = () => {
  const reset = useCallback((init: BittensorSettingsOpenOptions) => {
    wizardOpenState$.next({
      ...DEFAULT_STATE,
      networkId: init.networkId,
      address: init.address,
      step: init.step ?? "settings",
      onSubmittedCallback: init.onSubmitted ?? null,
    })
  }, [])

  return reset
}

const useBittensorSettingsWizardProvider = () => {
  const [
    { networkId, address, step, hash, selectedAcceptLockedAlpha, onSubmittedCallback },
    setWizardState,
  ] = useState(() => wizardOpenState$.getValue())

  const nativeTokenId = useMemo(() => subNativeTokenId(networkId), [networkId])
  const account = useAccountByAddress(address)
  const nativeToken = useToken(nativeTokenId, "substrate-native")
  const accountPicker = useOpenClose()

  // Fetch the current accept-locked-alpha flag from chain (spec 421); null = unsupported runtime
  const { data: currentAcceptLockedAlpha, isLoading: isAcceptLockedAlphaLoading } =
    useGetBittensorAcceptsLockedAlpha({
      networkId: nativeToken?.networkId,
      address: account?.address,
    })

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

  // Whether the accept-locked-alpha toggle differs from chain (only when the flag is supported)
  const rejectFlagChanged = useMemo(
    () =>
      typeof currentAcceptLockedAlpha === "boolean" &&
      typeof selectedAcceptLockedAlpha === "boolean" &&
      selectedAcceptLockedAlpha !== currentAcceptLockedAlpha,
    [currentAcceptLockedAlpha, selectedAcceptLockedAlpha]
  )

  const canSubmit = rejectFlagChanged

  // The payload only includes the call when the toggle changed
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
    includeRejectFlag: rejectFlagChanged,
    acceptLockedAlpha: selectedAcceptLockedAlpha ?? false,
  })

  const setAddress = useCallback(
    (newAddress: Address) =>
      setWizardState((prev) => ({
        ...prev,
        address: newAddress,
        selectedAcceptLockedAlpha: null,
      })),
    []
  )

  const setNetworkId = useCallback(
    (newNetworkId: DotNetworkId) =>
      setWizardState((prev) => ({
        ...prev,
        networkId: newNetworkId,
        selectedAcceptLockedAlpha: null,
      })),
    []
  )

  const setStep = useCallback(
    (newStep: BittensorSettingsStep) => setWizardState((prev) => ({ ...prev, step: newStep })),
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
    networkId,
    address,
    step,
    hash,
    selectedAcceptLockedAlpha,
    currentAcceptLockedAlpha,
    isAcceptLockedAlphaLoading,
    // hide the toggle on runtimes that don't expose the flag (resolves to null once loaded)
    acceptLockedAlphaUnsupported: !isAcceptLockedAlphaLoading && currentAcceptLockedAlpha === null,
    account,
    nativeToken,
    accountPicker,
    canSubmit,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
    setAddress,
    setNetworkId,
    setStep,
    setSelectedAcceptLockedAlpha,
    onSubmitted,
  }
}

export const [BittensorSettingsWizardProvider, useBittensorSettingsWizard] = provideContext(
  useBittensorSettingsWizardProvider
)
