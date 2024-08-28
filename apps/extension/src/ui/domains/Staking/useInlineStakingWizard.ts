import { TokenId } from "@talismn/chaindata-provider"
import { papiStringify } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import { Address, BalanceFormatter } from "extension-core"
import { atom, useAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Hex } from "viem"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useBalance } from "@ui/hooks/useBalance"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"

import { useFeeToken } from "../SendFunds/useFeeToken"
import { useExistentialDeposit } from "./useExistentialDeposit"
import { useIsSoloStaking } from "./useIsSoloStaking"
import { useNominationPool } from "./useNominationPools"
import { useNomPoolIdByMember } from "./useNomPoolIdByMember"
import { useNomPoolsMinJoinBond } from "./useNomPoolsMinJoinBond"
import { useNomPoolState } from "./useNomPoolState"

type InlineStakingWizardStep = "form" | "review" | "follow-up"

type InlineStakingWizardState = {
  step: InlineStakingWizardStep
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

const DEFAULT_STATE: InlineStakingWizardState = {
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

const inlineStakingWizardAtom = atom(DEFAULT_STATE)

const useInnerOpenClose = (key: "isAccountPickerOpen" | "isPoolPickerOpen") => {
  const [state, setState] = useAtom(inlineStakingWizardAtom)
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

export const useInlineStakingWizard = () => {
  const { t } = useTranslation()
  const [state, setState] = useAtom(inlineStakingWizardAtom)

  const { step, displayMode, hash, isSubmitting, submitErrorMessage } = state

  const account = useAccountByAddress(state.address)
  const token = useToken(state.tokenId)
  const feeToken = useFeeToken(token?.id)
  const pool = useNominationPool(token?.chain?.id, state.poolId)
  const tokenRates = useTokenRates(state.tokenId)
  const formatter = useMemo(
    () =>
      typeof state.plancks === "bigint"
        ? new BalanceFormatter(state.plancks, token?.decimals, tokenRates)
        : null,
    [state.plancks, token?.decimals, tokenRates]
  )
  const { data: minJoinBond } = useNomPoolsMinJoinBond(token?.chain?.id)
  const balance = useBalance(state.address!, state.tokenId!)

  const accountPicker = useInnerOpenClose("isAccountPickerOpen")
  const poolPicker = useInnerOpenClose("isPoolPickerOpen")

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

  const isFormValid = useMemo(
    () =>
      !!account &&
      !!token &&
      !!pool &&
      !!formatter &&
      !!minJoinBond &&
      formatter.planck >= minJoinBond,
    [account, formatter, minJoinBond, pool, token]
  )

  const setStep = useCallback(
    (step: InlineStakingWizardStep) => {
      setState((prev) => {
        if (prev.step === "form" && step === "review" && !isFormValid) return prev

        return { ...prev, step }
      })
    },
    [isFormValid, setState]
  )

  const reset = useCallback(
    (init: Pick<InlineStakingWizardState, "address" | "tokenId">) =>
      setState({ ...DEFAULT_STATE, ...init }),
    [setState]
  )

  const { data: sapi } = useScaleApi(token?.chain?.id)

  const {
    data: payloadAndMetadata,
    isLoading: isLoadingPayload,
    error: errorPayload,
  } = useQuery({
    queryKey: ["getExtrinsicPayload", "NominationPools.join", papiStringify(state)], // safe stringify because contains bigint
    queryFn: async () => {
      const { address, poolId, plancks } = state
      if (!sapi || !address || !poolId || !plancks) return null
      if (!isFormValid) return null

      return sapi.getExtrinsicPayload(
        "NominationPools",
        "join",
        {
          amount: plancks,
          pool_id: poolId,
        },
        { address }
      )
    },
  })

  const { payload, txMetadata } = payloadAndMetadata || {}

  const {
    // used to get an estimate before amount is known
    data: fakeFeeEstimate,
  } = useQuery({
    queryKey: ["feeEstimate", state.poolId, state.address, minJoinBond?.toString()],
    queryFn: async () => {
      const { address, poolId } = state
      if (!sapi || !address || !poolId || !minJoinBond) return null
      const { payload } = await sapi.getExtrinsicPayload(
        "NominationPools",
        "join",
        {
          amount: minJoinBond,
          pool_id: poolId,
        },
        { address }
      )
      return sapi.getFeeEstimate(payload)
    },
  })

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useQuery({
    queryKey: ["feeEstimate", payloadAndMetadata?.payload], // safe stringify because contains bigint
    queryFn: () => {
      if (!sapi || !payloadAndMetadata?.payload) return null
      return sapi.getFeeEstimate(payloadAndMetadata.payload)
    },
  })

  const onSubmitted = useCallback(
    (hash: Hex) => {
      if (hash) setState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [setState]
  )

  const existentialDeposit = useExistentialDeposit(token?.id)

  const maxPlancks = useMemo(() => {
    if (!balance || !existentialDeposit || !fakeFeeEstimate) return null
    // use 11x fake fee estimate as we block form based on 10x the real fee estimate
    if (existentialDeposit.planck + fakeFeeEstimate * 11n > balance.transferable.planck) return null
    return balance.transferable.planck - existentialDeposit.planck - fakeFeeEstimate * 11n
  }, [balance, existentialDeposit, fakeFeeEstimate])

  const { data: isSoloStaking } = useIsSoloStaking(token?.chain?.id, state.address)
  const { data: currentlyStakingNomPoolId } = useNomPoolIdByMember(token?.chain?.id, state.address)
  const { data: poolState } = useNomPoolState(token?.chain?.id, state.poolId)

  const inputErrorMessage = useMemo(() => {
    if (isSoloStaking)
      return t("An account cannot do both regular staking and nomination pool staking")
    if (typeof currentlyStakingNomPoolId === "number" && currentlyStakingNomPoolId !== state.poolId)
      return t("You are already staking in another nomination pool ({{poolId}})", {
        poolId: currentlyStakingNomPoolId,
      })
    if (poolState?.isFull) return t("This nomination pool is full")
    if (poolState && !poolState.isOpen) return t("This nomination pool is not open")

    if (!formatter || !minJoinBond) return null

    // TODO : account is already staking in another pool
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
      existentialDeposit.planck + formatter.planck + feeEstimate * 10n > balance.transferable.planck // 10x fee for future unstaking, as max button accounts for 11x with a fake fee estimate
    )
      return t(
        "Insufficient balance to cover staking, the existential deposit, and the future unstaking fee"
      )

    // TODO : pool is full
    if (formatter.planck < minJoinBond)
      return t("Minimum bond is {{amount}} {{symbol}}", {
        anount: new BalanceFormatter(minJoinBond, token?.decimals).tokens,
        symbol: token?.symbol,
      })

    return null
  }, [
    balance,
    currentlyStakingNomPoolId,
    existentialDeposit?.planck,
    feeEstimate,
    formatter,
    isSoloStaking,
    minJoinBond,
    poolState,
    state.poolId,
    t,
    token?.decimals,
    token?.symbol,
  ])

  return {
    account,
    token,
    tokenRates,
    pool,
    formatter,
    displayMode,
    accountPicker,
    poolPicker,
    isFormValid,
    step,
    hash,
    isSubmitting,
    inputErrorMessage,
    submitErrorMessage,
    feeToken,
    maxPlancks,

    setAddress,
    setTokenId,
    setPoolId,
    setPlancks,
    setStep,
    toggleDisplayMode,
    reset,

    payload: !inputErrorMessage ? payload : null,
    txMetadata,
    isLoadingPayload,
    errorPayload,

    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,

    onSubmitted,
  }
}
