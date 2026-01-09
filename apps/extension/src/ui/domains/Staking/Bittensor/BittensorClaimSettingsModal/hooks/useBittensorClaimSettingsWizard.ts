import { subNativeTokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BehaviorSubject } from "rxjs"
import { useOpenClose } from "talisman-ui"
import { Hex } from "viem"

import { provideContext } from "@talisman/util/provideContext"
import { RootClaimType } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useGetBittensorClaimType } from "@ui/domains/Staking/hooks/bittensor/dTao/useGetBittensorClaimType"
import { useAccountByAddress, useToken } from "@ui/state"

import { DEFAULT_ROOT_CLAIM_TYPE } from "../../utils/constants"
import { BITTENSOR_NETWORK_ID } from "../constants"

export type ClaimSettingsStep = "claim-settings" | "select-subnets" | "follow-up"

type WizardState = {
  step: ClaimSettingsStep
  address: Address | null
  hash: Hex | null
  selectedClaimType: RootClaimType
  selectedSubnets: number[]
  onSubmittedCallback: (() => void) | null
}

export type BittensorClaimSettingsOpenOptions = {
  address: Address
  step?: ClaimSettingsStep
  onSubmitted?: () => void
}

const DEFAULT_STATE: WizardState = {
  step: "claim-settings",
  address: null,
  hash: null,
  selectedClaimType: DEFAULT_ROOT_CLAIM_TYPE,
  selectedSubnets: [],
  onSubmittedCallback: null,
}

const wizardOpenState$ = new BehaviorSubject(DEFAULT_STATE)

export const useResetBittensorClaimSettingsWizard = () => {
  const reset = useCallback((init: BittensorClaimSettingsOpenOptions) => {
    wizardOpenState$.next({
      ...DEFAULT_STATE,
      address: init.address,
      step: init.step ?? "claim-settings",
      onSubmittedCallback: init.onSubmitted ?? null,
    })
  }, [])

  return reset
}

const useBittensorClaimSettingsWizardProvider = () => {
  const [
    { address, step, hash, selectedClaimType, selectedSubnets, onSubmittedCallback },
    setWizardState,
  ] = useState(() => wizardOpenState$.getValue())

  const nativeTokenId = useMemo(() => subNativeTokenId(BITTENSOR_NETWORK_ID), [])
  const account = useAccountByAddress(address)
  const nativeToken = useToken(nativeTokenId, "substrate-native")
  const accountPicker = useOpenClose()

  // Fetch the current claim type from chain
  const { data: claimTypeData, isLoading: isClaimTypeLoading } = useGetBittensorClaimType({
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

  // Compare on-chain values with in-memory values to determine if submit is allowed
  const canSubmit = useMemo(() => {
    if (!claimTypeData) return false

    // If claim type changed, can submit
    if (selectedClaimType !== claimTypeData.claimType) return true

    // If claim type is KeepSubnets, check if subnets changed
    if (selectedClaimType === "KeepSubnets") {
      const originalSubnets = claimTypeData.subnets ?? []
      if (selectedSubnets.length !== originalSubnets.length) return true
      const sortedSelected = [...selectedSubnets].sort((a, b) => a - b)
      const sortedOriginal = [...originalSubnets].sort((a, b) => a - b)
      return sortedSelected.some((subnet, i) => subnet !== sortedOriginal[i])
    }

    return false
  }, [claimTypeData, selectedClaimType, selectedSubnets])

  const setAddress = useCallback(
    (newAddress: Address) => setWizardState((prev) => ({ ...prev, address: newAddress })),
    [],
  )

  const setStep = useCallback(
    (newStep: ClaimSettingsStep) => setWizardState((prev) => ({ ...prev, step: newStep })),
    [],
  )

  const setSelectedClaimType = useCallback(
    (claimType: RootClaimType) =>
      setWizardState((prev) => ({ ...prev, selectedClaimType: claimType })),
    [],
  )

  const setSelectedSubnets = useCallback(
    (subnets: number[]) => setWizardState((prev) => ({ ...prev, selectedSubnets: subnets })),
    [],
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
    [onSubmittedCallback],
  )

  return {
    address,
    step,
    hash,
    selectedClaimType,
    selectedSubnets,
    account,
    nativeToken,
    accountPicker,
    claimTypeData,
    isClaimTypeLoading,
    canSubmit,
    setAddress,
    setStep,
    setSelectedClaimType,
    setSelectedSubnets,
    onSubmitted,
  }
}

export const [BittensorClaimSettingsWizardProvider, useBittensorClaimSettingsWizard] =
  provideContext(useBittensorClaimSettingsWizardProvider)
