import { subNativeTokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BehaviorSubject } from "rxjs"
import { useOpenClose } from "talisman-ui"
import { Hex } from "viem"

import { provideContext } from "@talisman/util/provideContext"
import { useAccountByAddress, useToken } from "@ui/state"

import { BITTENSOR_NETWORK_ID } from "../constants"

export type ClaimSettingsStep = "claim-settings" | "follow-up"

type WizardState = {
  step: ClaimSettingsStep
  address: Address | null
  hash: Hex | null
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
  const [{ address, step, hash, onSubmittedCallback }, setWizardState] = useState(() =>
    wizardOpenState$.getValue(),
  )

  const nativeTokenId = useMemo(() => subNativeTokenId(BITTENSOR_NETWORK_ID), [])
  const account = useAccountByAddress(address)
  const nativeToken = useToken(nativeTokenId, "substrate-native")
  const accountPicker = useOpenClose()

  useEffect(() => {
    const subscription = wizardOpenState$.subscribe((state) => {
      setWizardState(state)
    })
    return () => subscription.unsubscribe()
  }, [])

  const setAddress = useCallback(
    (newAddress: Address) => setWizardState((prev) => ({ ...prev, address: newAddress })),
    [],
  )

  const setStep = useCallback(
    (newStep: ClaimSettingsStep) => setWizardState((prev) => ({ ...prev, step: newStep })),
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
    account,
    nativeToken,
    accountPicker,
    setAddress,
    setStep,
    onSubmitted,
  }
}

export const [BittensorClaimSettingsWizardProvider, useBittensorClaimSettingsWizard] =
  provideContext(useBittensorClaimSettingsWizardProvider)
