import { SubDTaoToken, subNativeTokenId, TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { useCallback, useMemo, useState } from "react"
import { BehaviorSubject } from "rxjs"
import { Hex } from "viem"

import { provideContext } from "@talisman/util/provideContext"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccountByAddress, useToken } from "@ui/state"

import { useFeeToken } from "../../../SendFunds/useFeeToken"
import { useGetFeeEstimate } from "../../shared/useGetFeeEstimate"
import { useBittensorChangeValidatorModal } from "./useBittensorChangeValidatorModal"
import { useBittensorMoveStake } from "./useBittensorMoveStake"
import {
  BittensorStakingPosition,
  useBittensorStakingPositions,
} from "./useBittensorStakingPositions"

export type ChangeValidatorStep =
  | "form"
  | "select-position"
  | "select-validator"
  | "review"
  | "follow-up"

type WizardState = {
  step: ChangeValidatorStep
  tokenId: TokenId | null
  address: Address | null
  newHotkey: string | null
  hash: Hex | null
}

export type ChangeValidatorOpenOptions = {
  tokenId: TokenId
  address?: Address
}

const DEFAULT_STATE: WizardState = {
  step: "form",
  tokenId: null,
  address: null,
  newHotkey: null,
  hash: null,
}

const wizardOpenState$ = new BehaviorSubject(DEFAULT_STATE)

export const useResetBittensorChangeValidatorWizard = () => {
  const reset = useCallback((init: ChangeValidatorOpenOptions) => {
    wizardOpenState$.next({
      ...DEFAULT_STATE,
      tokenId: init.tokenId,
      address: init.address ?? null,
    })
  }, [])

  return reset
}

const useBittensorChangeValidatorWizardProvider = () => {
  const { genericEvent } = useAnalytics()
  const { close } = useBittensorChangeValidatorModal()
  const [{ step, tokenId, address, newHotkey, hash }, setWizardState] = useState<WizardState>(
    () => wizardOpenState$.value,
  )

  const token = useToken(tokenId) as SubDTaoToken | null
  const networkId = token?.networkId ?? null
  const nativeTokenId = useMemo(() => (networkId ? subNativeTokenId(networkId) : null), [networkId])
  const nativeToken = useToken(nativeTokenId, "substrate-native")
  const feeToken = useFeeToken(nativeToken?.id)

  const positions = useBittensorStakingPositions(networkId)

  // Find the current position based on the token
  const currentPosition = useMemo<BittensorStakingPosition | null>(() => {
    if (!token || !tokenId) return null

    // Find position matching this token (and optionally address)
    const position = positions.find((p) => {
      const tokenMatch = p.token.id === tokenId
      const addressMatch = !address || p.balance.address === address
      return tokenMatch && addressMatch
    })

    return position ?? null
  }, [positions, token, tokenId, address])

  // Derive address from current position if not explicitly set
  const effectiveAddress = address ?? currentPosition?.balance.address ?? null
  const account = useAccountByAddress(effectiveAddress)

  // Get the staked amount (alpha amount) from current position
  const alphaAmount = useMemo(() => {
    if (!currentPosition) return null
    return currentPosition.balance.free.planck
  }, [currentPosition])

  // Get the move stake payload
  const { payload, txMetadata, feeEstimatePayload } = useBittensorMoveStake({
    networkId,
    address: effectiveAddress,
    originHotkey: token?.hotkey,
    destinationHotkey: newHotkey,
    netuid: token?.netuid ?? null,
    alphaAmount,
  })

  // Fee estimation
  const { data: sapi } = useScaleApi(networkId)
  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload: feeEstimatePayload })

  const setStep = useCallback((step: ChangeValidatorStep) => {
    setWizardState((prev) => ({ ...prev, step }))
  }, [])

  const setNewHotkey = useCallback((hotkey: string) => {
    setWizardState((prev) => ({ ...prev, newHotkey: hotkey }))
  }, [])

  // Select a position (used from position selector)
  const setPosition = useCallback((position: BittensorStakingPosition) => {
    setWizardState((prev) => ({
      ...prev,
      step: "form",
      tokenId: position.token.id,
      address: position.balance.address,
      newHotkey: null, // Reset new hotkey when changing position
    }))
  }, [])

  const selectValidator = useCallback(
    (hotkey: string) => {
      setNewHotkey(hotkey)
      // Go back to form step after selection (not review)
      setStep("form")
    },
    [setNewHotkey, setStep],
  )

  const onSubmitted = useCallback(
    (hash: Hex) => {
      genericEvent("Bittensor Change Validator", { tokenId })
      if (hash) setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [genericEvent, tokenId],
  )

  // Current hotkey from the token (for display in form)
  const currentHotkey = token?.hotkey ?? null

  return {
    step,
    token,
    tokenId,
    address: effectiveAddress,
    currentHotkey,
    newHotkey,
    hash,
    currentPosition,
    positions,
    nativeToken,
    feeToken,
    account,
    alphaAmount,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    close,
    setStep,
    setPosition,
    selectValidator,
    onSubmitted,
  }
}

export const [BittensorChangeValidatorWizardProvider, useBittensorChangeValidatorWizard] =
  provideContext(useBittensorChangeValidatorWizardProvider)
