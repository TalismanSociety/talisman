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

import { useExistentialDeposit } from "../../../hooks/useExistentialDeposit"
import { useFeeToken } from "../../SendFunds/useFeeToken"
import { useGetStakeInfo } from "../shared/useGetStakeInfo"

type WizardStep = "form" | "review" | "follow-up" | "select"

type WizardState = {
  step: WizardStep
  address: Address | null
  tokenId: TokenId | null
  poolId: number | string | null
  plancks: bigint | null
  displayMode: "token" | "fiat"
  isAccountPickerOpen: boolean
  hash: Hex | null
  isDefaultOption: boolean
}

const DEFAULT_STATE: WizardState = {
  step: "form",
  address: null,
  tokenId: null,
  poolId: 12,
  plancks: null,
  displayMode: "token",
  isAccountPickerOpen: false,
  hash: null,
  isDefaultOption: true,
}

const wizardState$ = new BehaviorSubject(DEFAULT_STATE)

const setWizardState = (state: SetStateAction<WizardState>) => {
  if (typeof state === "function") wizardState$.next(state(wizardState$.value))
  else wizardState$.next(state)
}

const [useWizardState] = bind(wizardState$)

// TODO: this is meant to handle a pool picker too
const useInnerOpenClose = (key: "isAccountPickerOpen") => {
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

export const useResetNomPoolBondWizard = () => {
  const reset = useCallback(
    (init: Pick<WizardState, "address" | "tokenId" | "poolId" | "step">) =>
      setWizardState({ ...DEFAULT_STATE, ...init }),
    [],
  )

  return reset
}

export const useBondWizard = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const { poolId, step, displayMode, hash, tokenId, address, plancks, isDefaultOption } =
    useWizardState()

  const balance = useBalance(address, tokenId)
  const account = useAccountByAddress(address)
  const token = useToken(tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(tokenId)
  const existentialDeposit = useExistentialDeposit(token?.id)
  const accountPicker = useInnerOpenClose("isAccountPickerOpen")

  const { data: sapi } = useScaleApi(token?.chain?.id)

  const {
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    errorFeeEstimate,
    isLoadingFeeEstimate,
    bondType,
    currentPoolId,
    hasJoinedNomPool,
    minJoinBond,
    isSoloStaking,
    poolState,
    canStake,
    isCanStakeLoading,
  } = useGetStakeInfo({
    sapi,
    address,
    poolId,
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

  const setPlancks = useCallback(
    (plancks: bigint | null) => setWizardState((prev) => ({ ...prev, plancks })),
    [],
  )

  const setIsDefaultOption = useCallback(
    (isDefaultOption: boolean) => setWizardState((prev) => ({ ...prev, isDefaultOption })),
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
      !!formatter &&
      typeof minJoinBond === "bigint" &&
      plancks &&
      plancks > 0n,
    [account, formatter, minJoinBond, plancks, poolId, token],
  )

  useEffect(() => {
    /**
     * if user is already staking in pool, set poolId to that pool
     * If the user chooses to stake in a different pool, we should not set the poolId to the one the user is currently staking in
     */
    if (!!currentPoolId && currentPoolId !== poolId && isDefaultOption)
      setWizardState((prev) => ({ ...prev, poolId: currentPoolId }))
  }, [bondType, currentPoolId, isDefaultOption, poolId, step, tokenId])

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
      genericEvent(`${bondType} Bond`, { tokenId, isBondExtra: hasJoinedNomPool })
      if (hash) setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [genericEvent, hasJoinedNomPool, tokenId, bondType],
  )

  const maxPlancks = useMemo(() => {
    if (!balance || !existentialDeposit || !feeEstimate) return null
    if (existentialDeposit.planck + feeEstimate * 11n > balance.transferable.planck) return null
    return balance.transferable.planck - existentialDeposit.planck - feeEstimate * 11n
  }, [balance, existentialDeposit, feeEstimate])

  const stakeWarningMessage = useMemo(() => {
    if (!canStake) return t("Stake/unstake currently paused")
    return null
  }, [canStake, t])

  const inputErrorMessage = useMemo(() => {
    if (isSoloStaking)
      return t("Account has an open validator staking position, please unbond first")

    if (!currentPoolId && poolState?.isFull) return t("This nomination pool is full")
    if (!currentPoolId && poolState && !poolState.isOpen)
      return t("This nomination pool is not open")

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

    if (!hasJoinedNomPool && formatter.planck < minJoinBond)
      return t("Minimum bond is {{amount}} {{symbol}}", {
        amount: new BalanceFormatter(minJoinBond, token?.decimals).tokens,
        symbol: token?.symbol,
      })

    return null
  }, [
    isSoloStaking,
    t,
    currentPoolId,
    poolState,
    formatter,
    minJoinBond,
    balance,
    feeEstimate,
    existentialDeposit?.planck,
    hasJoinedNomPool,
    token?.decimals,
    token?.symbol,
  ])

  return {
    account,
    token,
    tokenRates,
    poolId,
    formatter,
    displayMode,
    accountPicker,
    isFormValid,
    step,
    hash,
    feeToken,
    maxPlancks,
    inputErrorMessage,
    stakeWarningMessage,
    bondType,

    payload: !inputErrorMessage && isFormValid && canStake && !isCanStakeLoading ? payload : null,
    txMetadata,
    isLoadingPayload,
    errorPayload,

    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,

    setAddress,
    setTokenId,
    setPoolId,
    setPlancks,
    setStep,
    setIsDefaultOption,
    toggleDisplayMode,

    onSubmitted,
  }
}
