import { bind } from "@react-rxjs/core"
import { TokenId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
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
import { getNomPoolStakingPayload } from "../helpers"
import { useIsSoloStaking } from "../shared/useIsSoloStaking"
import { useNomPoolByMember } from "../shared/useNomPoolByMember"
import { useNomPoolsClaimPermission } from "../shared/useNomPoolsClaimPermission"
import { useNomPoolsMinJoinBond } from "../shared/useNomPoolsMinJoinBond"
import { useNomPoolState } from "../shared/useNomPoolState"

type WizardStep = "form" | "review" | "follow-up"

type WizardState = {
  step: WizardStep
  address: Address | null
  tokenId: TokenId | null
  poolId: number | null
  plancks: bigint | null
  displayMode: "token" | "fiat"
  isAccountPickerOpen: boolean
  hash: Hex | null
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
    (init: Pick<WizardState, "address" | "tokenId" | "poolId">) =>
      setWizardState({ ...DEFAULT_STATE, ...init }),
    [],
  )

  return reset
}

export const useNomPoolBondWizard = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const { poolId, step, displayMode, hash, tokenId, address, plancks } = useWizardState()

  const balance = useBalance(address, tokenId)
  const account = useAccountByAddress(address)
  const token = useToken(tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(tokenId)
  const existentialDeposit = useExistentialDeposit(token?.id)
  const accountPicker = useInnerOpenClose("isAccountPickerOpen")

  const { data: minJoinBond } = useNomPoolsMinJoinBond(token?.chain?.id)
  const { data: claimPermission } = useNomPoolsClaimPermission(token?.chain?.id, address)
  const { data: isSoloStaking } = useIsSoloStaking(token?.chain?.id, address)
  const { data: currentPool } = useNomPoolByMember(token?.chain?.id, address)
  const { data: poolState } = useNomPoolState(token?.chain?.id, poolId)

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
    (poolId: number) => setWizardState((prev) => ({ ...prev, poolId })),
    [],
  )

  const setPlancks = useCallback(
    (plancks: bigint | null) => setWizardState((prev) => ({ ...prev, plancks })),
    [],
  )

  const toggleDisplayMode = useCallback(() => {
    setWizardState((prev) => ({
      ...prev,
      displayMode: prev.displayMode === "token" ? "fiat" : "token",
    }))
  }, [])

  useEffect(() => {
    // if user is already staking in pool, set poolId to that pool
    if (currentPool && currentPool.pool_id !== poolId)
      setWizardState((prev) => ({ ...prev, poolId: currentPool.pool_id }))
  }, [currentPool, poolId])

  const isFormValid = useMemo(
    () => !!account && !!token && !!poolId && !!formatter && typeof minJoinBond === "bigint",
    [account, formatter, minJoinBond, poolId, token],
  )

  const setStep = useCallback(
    (step: WizardStep) => {
      setWizardState((prev) => {
        if (prev.step === "form" && step === "review" && !isFormValid) return prev

        return { ...prev, step }
      })
    },
    [isFormValid],
  )

  // we must craft a different extrinsic if the user is already staking in a pool
  const hasJoinedNomPool = useMemo(() => !!currentPool, [currentPool])

  const withSetClaimPermission = useMemo(() => {
    switch (claimPermission) {
      case "PermissionlessCompound":
      case "PermissionlessAll":
        return false
      default:
        // if the user is already staking in a pool, we shouldn't change the claim permission
        return !hasJoinedNomPool
    }
  }, [claimPermission, hasJoinedNomPool])

  const { data: sapi } = useScaleApi(token?.chain?.id)

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = useQuery({
    queryKey: [
      "getNomPoolStakingPayload",
      sapi?.id,
      address,
      poolId,
      plancks?.toString(),
      isFormValid,
      hasJoinedNomPool,
      withSetClaimPermission,
    ],
    queryFn: async () => {
      if (!sapi || !address || !poolId || !plancks) return null
      if (!isFormValid) return null

      return getNomPoolStakingPayload(
        sapi,
        address,
        poolId,
        plancks,
        hasJoinedNomPool,
        withSetClaimPermission,
      )
    },
    enabled: !!sapi,
  })

  const { payload, txMetadata } = payloadAndMetadata || {}

  const {
    // used to get an estimate before amount is known, for estimating maxPlancks
    data: fakeFeeEstimate,
  } = useQuery({
    queryKey: [
      "getNomPoolStakingPayload/estimateFee",
      sapi?.id,
      poolId,
      address,
      minJoinBond?.toString(),
      hasJoinedNomPool,
      withSetClaimPermission,
    ],
    queryFn: async () => {
      if (!sapi || !address || !poolId || typeof minJoinBond !== "bigint") return null

      const { payload } = await getNomPoolStakingPayload(
        sapi,
        address,
        poolId,
        minJoinBond,
        hasJoinedNomPool,
        withSetClaimPermission,
      )
      return sapi.getFeeEstimate(payload)
    },
    enabled: !!sapi,
  })

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useQuery({
    queryKey: ["feeEstimate", sapi?.id, payload], // safe stringify because contains bigint
    queryFn: () => {
      if (!sapi || !payload) return null
      return sapi.getFeeEstimate(payload)
    },
  })

  const onSubmitted = useCallback(
    (hash: Hex) => {
      genericEvent("NomPool Bond", { tokenId, isBondExtra: hasJoinedNomPool })
      if (hash) setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [genericEvent, hasJoinedNomPool, tokenId],
  )

  const maxPlancks = useMemo(() => {
    if (!balance || !existentialDeposit || !fakeFeeEstimate) return null
    // use 11x fake fee estimate as we block form based on 10x the real fee estimate
    if (existentialDeposit.planck + fakeFeeEstimate * 11n > balance.transferable.planck) return null
    return balance.transferable.planck - existentialDeposit.planck - fakeFeeEstimate * 11n
  }, [balance, existentialDeposit, fakeFeeEstimate])

  const inputErrorMessage = useMemo(() => {
    if (isSoloStaking) return t("Account is already staking")

    if (!currentPool && poolState?.isFull) return t("This nomination pool is full")
    if (!currentPool && poolState && !poolState.isOpen) return t("This nomination pool is not open")

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
    currentPool,
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

    payload: !inputErrorMessage ? payload : null,
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
    toggleDisplayMode,

    onSubmitted,
  }
}
