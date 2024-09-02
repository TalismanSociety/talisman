import { TokenId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { Address, BalanceFormatter } from "extension-core"
import { atom, useAtom, useSetAtom } from "jotai"
import { useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Hex } from "viem"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useBalance } from "@ui/hooks/useBalance"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"

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
  isPoolPickerOpen: boolean
  isSubmitting: boolean
  submitErrorMessage: string | null
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
  isPoolPickerOpen: false,
  isSubmitting: false,
  submitErrorMessage: null,
  hash: null,
}

const wizardAtom = atom(DEFAULT_STATE)

const useInnerOpenClose = (key: "isAccountPickerOpen" | "isPoolPickerOpen") => {
  const [state, setState] = useAtom(wizardAtom)
  const isOpen = state[key]

  const setIsOpen = useCallback(
    (value: boolean) => setState((prev) => ({ ...prev, [key]: value })),
    [key, setState]
  )

  const open = useCallback(() => setIsOpen(true), [setIsOpen])
  const close = useCallback(() => setIsOpen(false), [setIsOpen])

  const toggle = useCallback(
    () => setState((prev) => ({ ...prev, [key]: !prev[key] })),
    [key, setState]
  )

  return { isOpen, setIsOpen, open, close, toggle }
}

export const useResetNomPoolBondWizard = () => {
  const setState = useSetAtom(wizardAtom)

  const reset = useCallback(
    (init: Pick<WizardState, "address" | "tokenId" | "poolId">) =>
      setState({ ...DEFAULT_STATE, ...init }),
    [setState]
  )

  return reset
}

export const useNomPoolBondWizard = () => {
  const { t } = useTranslation()
  const [state, setState] = useAtom(wizardAtom)
  const { poolId, step, displayMode, hash } = state

  const balance = useBalance(state.address, state.tokenId)
  const account = useAccountByAddress(state.address)
  const token = useToken(state.tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(state.tokenId)
  const existentialDeposit = useExistentialDeposit(token?.id)
  const accountPicker = useInnerOpenClose("isAccountPickerOpen")

  const { data: minJoinBond } = useNomPoolsMinJoinBond(token?.chain?.id)
  const { data: claimPermission } = useNomPoolsClaimPermission(token?.chain?.id, state.address)
  const { data: isSoloStaking } = useIsSoloStaking(token?.chain?.id, state.address)
  const { data: currentPool } = useNomPoolByMember(token?.chain?.id, state.address)
  const { data: poolState } = useNomPoolState(token?.chain?.id, state.poolId)

  // TODO rename to amountToStake
  const formatter = useMemo(
    () =>
      typeof state.plancks === "bigint"
        ? new BalanceFormatter(state.plancks, token?.decimals, tokenRates)
        : null,
    [state.plancks, token?.decimals, tokenRates]
  )

  const setAddress = useCallback(
    (address: Address) => setState((prev) => ({ ...prev, address })),
    [setState]
  )

  const setTokenId = useCallback(
    (tokenId: TokenId) => setState((prev) => ({ ...prev, tokenId })),
    [setState]
  )

  const setPoolId = useCallback(
    (poolId: number) => setState((prev) => ({ ...prev, poolId })),
    [setState]
  )

  const setPlancks = useCallback(
    (plancks: bigint | null) => setState((prev) => ({ ...prev, plancks })),
    [setState]
  )

  const toggleDisplayMode = useCallback(() => {
    setState((prev) => ({ ...prev, displayMode: prev.displayMode === "token" ? "fiat" : "token" }))
  }, [setState])

  useEffect(() => {
    // if user is already staking in pool, set poolId to that pool
    if (currentPool && currentPool.pool_id !== state.poolId)
      setState((prev) => ({ ...prev, poolId: currentPool.pool_id }))
  }, [currentPool, setState, state.poolId])

  const isFormValid = useMemo(
    () =>
      !!account &&
      !!token &&
      !!state.poolId &&
      !!formatter &&
      !!minJoinBond &&
      formatter.planck >= minJoinBond,
    [account, formatter, minJoinBond, state.poolId, token]
  )

  const setStep = useCallback(
    (step: WizardStep) => {
      setState((prev) => {
        if (prev.step === "form" && step === "review" && !isFormValid) return prev

        return { ...prev, step }
      })
    },
    [isFormValid, setState]
  )

  const withSetClaimPermission = useMemo(() => {
    switch (claimPermission) {
      case "PermissionlessCompound":
      case "PermissionlessAll":
        return false
      default:
        return true
    }
  }, [claimPermission])

  // we must craft a different extrinsic if the user is already staking in a pool
  const hasJoinedNomPool = useMemo(() => !!currentPool, [currentPool])

  const { data: sapi } = useScaleApi(token?.chain?.id)

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = useQuery({
    queryKey: [
      "getNomPoolStakingPayload",
      sapi?.id,
      state.address,
      state.poolId,
      state.plancks?.toString(),
      isFormValid,
      hasJoinedNomPool,
      withSetClaimPermission,
    ],
    queryFn: async () => {
      const { address, poolId, plancks } = state
      if (!sapi || !address || !poolId || !plancks) return null
      if (!isFormValid) return null

      return getNomPoolStakingPayload(
        sapi,
        address,
        poolId,
        plancks,
        hasJoinedNomPool,
        withSetClaimPermission
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
      state.poolId,
      state.address,
      minJoinBond?.toString(),
      hasJoinedNomPool,
      withSetClaimPermission,
    ],
    queryFn: async () => {
      const { address, poolId } = state
      if (!sapi || !address || !poolId || !minJoinBond) return null

      const { payload } = await getNomPoolStakingPayload(
        sapi,
        address,
        poolId,
        minJoinBond,
        hasJoinedNomPool,
        withSetClaimPermission
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
      if (hash) setState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [setState]
  )

  const maxPlancks = useMemo(() => {
    if (!balance || !existentialDeposit || !fakeFeeEstimate) return null
    // use 11x fake fee estimate as we block form based on 10x the real fee estimate
    if (existentialDeposit.planck + fakeFeeEstimate * 11n > balance.transferable.planck) return null
    return balance.transferable.planck - existentialDeposit.planck - fakeFeeEstimate * 11n
  }, [balance, existentialDeposit, fakeFeeEstimate])

  const inputErrorMessage = useMemo(() => {
    if (isSoloStaking)
      return t("An account cannot do both regular staking and nomination pool staking")

    if (!currentPool && poolState?.isFull) return t("This nomination pool is full") // TODO : picking another ?
    if (!currentPool && poolState && !poolState.isOpen) return t("This nomination pool is not open") // TODO : allow picking another ?

    if (!formatter || !minJoinBond) return null

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
        "Insufficient balance to cover staking, the existential deposit, and the future unbonding and withdrawal fees"
      )

    // TODO : pool is full
    if (formatter.planck < minJoinBond)
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
