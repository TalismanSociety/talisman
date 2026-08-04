import type { Address } from "@core/types/base"
import { type SubDTaoToken, subNativeTokenId, type TokenId } from "@talismn/chaindata-provider"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import type { Hex } from "viem"

import { useFeeToken } from "../../../SendFunds/useFeeToken"
import {
  useDTaoRootStakeHold,
  useDTaoRootStakeHoldMessage,
} from "../../hooks/bittensor/dTao/useDTaoRootStakeHold"
import { useGetFeeEstimate } from "../../shared/useGetFeeEstimate"
import { ROOT_NETUID } from "../utils/constants"
import { useBittensorChangeValidatorModal } from "./useBittensorChangeValidatorModal"
import { useBittensorMoveStake } from "./useBittensorMoveStake"
import {
  type BittensorStakingPosition,
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
  /** When provided, the position selector shows all positions for this subnet instead of filtering by tokenId. */
  netuid?: number
}

const DEFAULT_STATE: WizardState = {
  step: "form",
  tokenId: null,
  address: null,
  newHotkey: null,
  hash: null,
}

const useBittensorChangeValidatorWizardProvider = () => {
  const { genericEvent } = useAnalytics()
  const { close, args } = useBittensorChangeValidatorModal()
  const [{ step, newHotkey, hash, tokenId, address }, setWizardState] = useState<WizardState>(
    () => Object.assign({}, DEFAULT_STATE, args) // init with params passed to modal
  )

  const token = useToken(tokenId) as SubDTaoToken | null
  const networkId = token?.networkId ?? null
  const nativeTokenId = useMemo(() => (networkId ? subNativeTokenId(networkId) : null), [networkId])
  const nativeToken = useToken(nativeTokenId, "substrate-native")
  const feeToken = useFeeToken(nativeToken?.id)

  const allPositions = useBittensorStakingPositions(networkId)
  const positions = useMemo(() => {
    // When netuid is provided, show all positions for that subnet (used from subnet list)
    if (args?.netuid !== undefined)
      return allPositions.filter((pos) => pos.token.netuid === args.netuid)
    // Otherwise filter by exact tokenId (existing behavior for portfolio context)
    if (!args?.tokenId) return allPositions
    return allPositions.filter((pos) => pos.token.id === args.tokenId)
  }, [allPositions, args?.tokenId, args?.netuid])

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

  // (spec 441) root stake inside its RootStakeUnlockInterval hold window cannot leave root:
  // move_stake off the pair would revert with RootStakeLocked
  const rootStakeHold = useDTaoRootStakeHold({
    networkId,
    balance: token?.netuid === ROOT_NETUID ? currentPosition?.balance : null,
  })
  const rootStakeHoldMessage = useDTaoRootStakeHoldMessage(rootStakeHold)

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
    [setNewHotkey, setStep]
  )

  const onSubmitted = useCallback(
    (hash: Hex) => {
      genericEvent("Bittensor Change Validator", { tokenId })
      if (hash) setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [genericEvent, tokenId]
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
    payload: rootStakeHoldMessage ? null : payload,
    rootStakeHoldMessage,
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
