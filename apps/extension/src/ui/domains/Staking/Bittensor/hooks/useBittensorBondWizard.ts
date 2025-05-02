import { bind } from "@react-rxjs/core"
import { TokenId } from "@talismn/chaindata-provider"
import { Address, BalanceFormatter } from "extension-core"
import { SetStateAction, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { BehaviorSubject } from "rxjs"
import { Hex } from "viem"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccountByAddress, useBalance, useToken, useTokenRates } from "@ui/state"

import { useExistentialDeposit } from "../../../../hooks/useExistentialDeposit"
import { useFeeToken } from "../../../SendFunds/useFeeToken"
import { useGetBittensorStakeInfo } from "./useGetBittensorStakeInfo"

export type WizardStep =
  | "form"
  | "subnet-form"
  | "review"
  | "subnet-review"
  | "follow-up"
  | "select"
  | "select-subnet"
export type StakeType = "root" | "subnet"

type WizardState = {
  step: WizardStep
  address: Address | null
  tokenId: TokenId | null
  poolId: number | string | null // rename to delegateHotkey & type string | null
  netuid: number | null
  plancks: bigint | null
  displayMode: "token" | "fiat"
  isAccountPickerOpen: boolean
  isSelectStakeDrawerOpen: boolean
  hash: Hex | null
  isDefaultOption: boolean
  stakeType: StakeType
}

const DEFAULT_STATE: WizardState = {
  step: "form",
  address: null,
  tokenId: null,
  poolId: null,
  netuid: null,
  plancks: null,
  displayMode: "token",
  isAccountPickerOpen: false,
  isSelectStakeDrawerOpen: false,
  hash: null,
  isDefaultOption: true,
  stakeType: "root",
}

const wizardState$ = new BehaviorSubject(DEFAULT_STATE)

const setWizardState = (state: SetStateAction<WizardState>) => {
  if (typeof state === "function") wizardState$.next(state(wizardState$.value))
  else wizardState$.next(state)
}

const [useWizardState] = bind(wizardState$)

type innerOpenCloseKey = "isAccountPickerOpen" | "isSelectStakeDrawerOpen"

// TODO: this is meant to handle a pool picker too
const useInnerOpenClose = (key: innerOpenCloseKey) => {
  const state = useWizardState()
  const isOpen = state[key]

  const setIsOpen = useCallback(
    (value: boolean) => setWizardState((prev) => ({ ...prev, [key]: value })),
    [key],
  )

  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])

  const toggle = useCallback(
    () => setWizardState((prev) => ({ ...prev, [key]: !prev[key] })),
    [key],
  )

  return { isOpen, setIsOpen, open, close, toggle }
}

export const useResetBittensorBondWizard = () => {
  const reset = useCallback(
    (
      init: Pick<
        WizardState,
        "address" | "tokenId" | "poolId" | "step" | "isSelectStakeDrawerOpen" | "stakeType"
      >,
    ) => setWizardState({ ...DEFAULT_STATE, ...init }),
    [],
  )

  return reset
}

export const useBittensorBondWizard = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const {
    poolId,
    netuid,
    step,
    stakeType,
    displayMode,
    hash,
    tokenId,
    address,
    plancks,
    isDefaultOption,
  } = useWizardState()

  const balance = useBalance(address, tokenId)
  const account = useAccountByAddress(address)
  const token = useToken(tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(tokenId)
  const existentialDeposit = useExistentialDeposit(token?.id)
  const accountPicker = useInnerOpenClose("isAccountPickerOpen")
  const selectStakeDrawer = useInnerOpenClose("isSelectStakeDrawerOpen")

  const { data: sapi } = useScaleApi(token?.chain?.id)

  const {
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    errorFeeEstimate,
    isLoadingFeeEstimate,
    currentPoolId,
    minJoinBond,

    taoToAlphaSlippage,
    taoToAlphaTalismanFee,
    alphaPrice,
    taoToAlphaConversionRate,
    expectedAlphaWithSlippage,
    isDynamicInfoLoading,
    isDynamicInfoError,
  } = useGetBittensorStakeInfo({
    sapi,
    address,
    poolId,
    netuid,
    plancks,
    chainId: token?.chain?.id,
  })

  // TODO rename to amountToStake
  const formatter = useMemo(
    () =>
      typeof plancks === "bigint"
        ? new BalanceFormatter(plancks, token?.decimals, tokenRates)
        : null,
    [plancks, token?.decimals, tokenRates],
  )

  const setAddress = useCallback(
    (address: Address) => setWizardState((prev) => ({ ...prev, address })),
    [],
  )

  const setTokenId = useCallback(
    (tokenId: TokenId) => setWizardState((prev) => ({ ...prev, tokenId })),
    [],
  )

  const setPoolId = useCallback(
    (poolId: number | string) => setWizardState((prev) => ({ ...prev, poolId })),
    [],
  )
  const setNetuid = useCallback(
    (netuid: number) => setWizardState((prev) => ({ ...prev, netuid })),
    [],
  )

  const setPlancks = useCallback(
    (plancks: bigint | null) => setWizardState((prev) => ({ ...prev, plancks })),
    [],
  )

  const setIsDefaultOption = useCallback(
    (isDefaultOption: boolean) => setWizardState((prev) => ({ ...prev, isDefaultOption })),
    [],
  )

  const setStakeType = useCallback(
    (stakeType: StakeType) => setWizardState((prev) => ({ ...prev, stakeType })),
    [],
  )

  const toggleDisplayMode = useCallback(() => {
    setWizardState((prev) => ({
      ...prev,
      displayMode: prev.displayMode === "token" ? "fiat" : "token",
    }))
  }, [])

  const isFormValid = useMemo(
    () =>
      !!account &&
      !!token &&
      !!poolId &&
      (stakeType === "root" ? true : !!netuid) &&
      !!formatter &&
      typeof minJoinBond === "bigint" &&
      plancks &&
      plancks > 0n,
    [account, formatter, minJoinBond, netuid, plancks, poolId, stakeType, token],
  )

  useEffect(() => {
    /**
     * if user is already staking in pool, set poolId to that pool
     * If the user chooses to stake in a different pool, we should not set the poolId to the one the user is currently staking in
     */
    if (!!currentPoolId && currentPoolId !== poolId && isDefaultOption)
      setWizardState((prev) => ({ ...prev, poolId: currentPoolId }))
  }, [currentPoolId, isDefaultOption, poolId, step, tokenId])

  const setStep = useCallback(
    (step: WizardStep) => {
      setWizardState((prev) => {
        if (prev.step === "form" && step === "review" && !isFormValid) return prev

        return { ...prev, step }
      })
    },
    [isFormValid],
  )

  const onSubmitted = useCallback(
    (hash: Hex) => {
      genericEvent("Bittensor Bond", { tokenId })
      if (hash) setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [genericEvent, tokenId],
  )

  const maxPlancks = useMemo(() => {
    if (!balance || !existentialDeposit || !feeEstimate) return null
    if (existentialDeposit.planck + feeEstimate * 11n > balance.transferable.planck) return null
    return balance.transferable.planck - existentialDeposit.planck - feeEstimate * 11n
  }, [balance, existentialDeposit, feeEstimate])

  const inputErrorMessage = useMemo(() => {
    if (!formatter || typeof minJoinBond !== "bigint") return null

    if (!!balance && !!formatter.planck && formatter.planck > balance.transferable.planck)
      return t("Insufficient balance")

    if (
      !!balance &&
      !!feeEstimate &&
      !!formatter.planck &&
      formatter.planck + feeEstimate > balance.transferable.planck
    )
      return t("Insufficient balance to cover fee")

    if (
      !!balance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      !!formatter.planck &&
      existentialDeposit.planck + formatter.planck + feeEstimate > balance.transferable.planck
    )
      return t("Insufficient balance to cover fee and keep account alive")

    if (
      !!balance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      !!formatter.planck &&
      existentialDeposit.planck + formatter.planck + feeEstimate * 10n > balance.transferable.planck // 10x fee for future unbonding, as max button accounts for 11x with a fake fee estimate
    )
      return t(
        "Insufficient balance to cover staking, the existential deposit, and the future unbonding and withdrawal fees",
      )

    if (formatter.planck < minJoinBond)
      return t("Minimum bond is {{amount}} {{symbol}}", {
        amount: new BalanceFormatter(minJoinBond, token?.decimals).tokens,
        symbol: token?.symbol,
      })

    return null
  }, [
    t,
    formatter,
    minJoinBond,
    balance,
    feeEstimate,
    existentialDeposit?.planck,
    token?.decimals,
    token?.symbol,
  ])

  return {
    account,
    token,
    tokenRates,
    poolId,
    netuid,
    formatter,
    displayMode,
    accountPicker,
    selectStakeDrawer,
    isFormValid,
    step,
    hash,
    feeToken,
    maxPlancks,
    inputErrorMessage,

    // TODO: revert payload comment to include inputErrorMessage
    payload: !inputErrorMessage && isFormValid ? payload : null,
    // payload: isFormValid ? payload : null,
    txMetadata,
    isLoadingPayload: isLoadingPayload,
    errorPayload,

    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    stakeType,

    taoToAlphaSlippage,
    taoToAlphaTalismanFee,
    alphaPrice,
    isDynamicInfoLoading,
    isDynamicInfoError,
    taoToAlphaConversionRate,
    expectedAlphaWithSlippage,

    setAddress,
    setTokenId,
    setNetuid,
    setPoolId,
    setPlancks,
    setStep,
    setStakeType,
    setIsDefaultOption,
    toggleDisplayMode,

    onSubmitted,
  }
}
