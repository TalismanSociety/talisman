import { tokenSymbolForAnalytics } from "@common/analytics/funds"
import type { Address } from "@core/types/base"
import { BalanceFormatter } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import type { InlineError } from "@ui/hooks/analytics/errorShown"
import { flows, useFlow } from "@ui/hooks/analytics/flows"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBalance } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useTokenRates } from "@ui/state/tokenRates"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"
import { useExistentialDeposit } from "../../../../hooks/useExistentialDeposit"
import { useFeeToken } from "../../../SendFunds/useFeeToken"
import { stakingSubmittedReport } from "../../shared/stakingAnalytics"
import { useGetStakeInfo } from "../../shared/useGetStakeInfo"
import { useBondModal } from "./useBondModal"

type WizardStep = "form" | "review" | "follow-up"

type WizardState = {
  step: WizardStep
  address: Address | null
  tokenId: TokenId | null
  poolId: number | string | null
  plancks: bigint | null
  displayMode: "token" | "fiat"
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
  hash: null,
  isDefaultOption: true,
}

const useBondWizardProvider = () => {
  const { t } = useTranslation()
  const { args, isOpen } = useBondModal()

  const [
    { poolId, step, displayMode, hash, tokenId, address, plancks, isDefaultOption },
    setWizardState,
  ] = useState<WizardState>(() =>
    args
      ? { ...DEFAULT_STATE, address: args.address, tokenId: args.tokenId, poolId: args.poolId }
      : DEFAULT_STATE
  )

  const balance = useBalance(address, tokenId)
  const account = useAccountByAddress(address)
  const token = useToken(tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(tokenId)
  const existentialDeposit = useExistentialDeposit(token?.id)
  const accountPicker = useOpenClose()

  const { data: sapi } = useScaleApi(token?.networkId)

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
    poolState,
  } = useGetStakeInfo({
    sapi,
    address,
    poolId,
    plancks,
    chainId: token?.networkId,
  })

  const amountToStake = useMemo(
    () =>
      typeof plancks === "bigint"
        ? new BalanceFormatter(plancks, token?.decimals, tokenRates)
        : null,
    [plancks, token?.decimals, tokenRates]
  )

  const network = useNetworkById(token?.networkId)

  const onSubmitted = useCallback(
    (hash: Hex) => {
      if (!hash) return
      const report = stakingSubmittedReport({
        account,
        network,
        symbol: tokenSymbolForAnalytics(token),
        usd: amountToStake?.fiat("usd"),
      })
      if (report) flows.staking.submitted({ ...report, transactionId: hash })
      setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [account, network, token, amountToStake]
  )

  useFlow(flows.staking, {
    active: isOpen && !!args,
    entry: args?.entry ?? "token_details",
    started: { mode: "stake" },
    attributes: { staking_type: "nomination_pool", direction: "stake" },
    step: step === "follow-up" ? null : step,
  })

  const setAddress = useCallback(
    (address: Address) => setWizardState((prev) => ({ ...prev, address })),
    []
  )

  const setTokenId = useCallback(
    (tokenId: TokenId) => setWizardState((prev) => ({ ...prev, tokenId })),
    []
  )

  const setPoolId = useCallback(
    (poolId: number | string) => setWizardState((prev) => ({ ...prev, poolId })),
    []
  )

  const setPlancks = useCallback(
    (plancks: bigint | null) => setWizardState((prev) => ({ ...prev, plancks })),
    []
  )

  const setIsDefaultOption = useCallback(
    (isDefaultOption: boolean) => setWizardState((prev) => ({ ...prev, isDefaultOption })),
    []
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
      !!amountToStake &&
      typeof minJoinBond === "bigint" &&
      plancks &&
      plancks > 0n,
    [account, amountToStake, minJoinBond, plancks, poolId, token]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    /**
     * if user is already staking in pool, set poolId to that pool
     * If the user chooses to stake in a different pool, we should not set the poolId to the one the user is currently staking in
     */
    if (currentPoolId && currentPoolId !== poolId && isDefaultOption)
      setWizardState((prev) => ({ ...prev, poolId: currentPoolId }))
  }, [bondType, currentPoolId, isDefaultOption, poolId, step, tokenId])

  const setStep = useCallback(
    (step: WizardStep) => {
      setWizardState((prev) => {
        if (prev.step === "form" && step === "review" && !isFormValid) return prev

        return { ...prev, step }
      })
    },
    [isFormValid]
  )

  const maxPlancks = useMemo(() => {
    if (!balance || !existentialDeposit || !feeEstimate) return null
    if (existentialDeposit.planck + feeEstimate * 11n > balance.transferable.planck) return null
    return balance.transferable.planck - existentialDeposit.planck - feeEstimate * 11n
  }, [balance, existentialDeposit, feeEstimate])

  const inputError = useMemo<InlineError | null>(() => {
    // NOTE: We don't have to check for this anymore.
    //       Users are now able to both solo stake and nompool stake at the same time.
    // if (isSoloStaking)
    //   return t("Account has an open validator staking position, please unbond first")

    if (!currentPoolId && poolState?.isFull)
      return { message: t("This nomination pool is full"), category: "input_invalid" }
    if (!currentPoolId && poolState && !poolState.isOpen)
      return { message: t("This nomination pool is not open"), category: "input_invalid" }

    if (!amountToStake || typeof minJoinBond !== "bigint") return null

    if (balance && amountToStake.planck && amountToStake.planck > balance.transferable.planck)
      return { message: t("Insufficient balance"), category: "insufficient_balance" }

    if (
      balance &&
      feeEstimate &&
      amountToStake.planck &&
      amountToStake.planck + feeEstimate > balance.transferable.planck
    )
      return { message: t("Insufficient balance to cover fee"), category: "insufficient_fee" }

    if (
      balance &&
      feeEstimate &&
      existentialDeposit?.planck &&
      amountToStake.planck &&
      existentialDeposit.planck + amountToStake.planck + feeEstimate > balance.transferable.planck
    )
      return {
        message: t("Insufficient balance to cover fee and keep account alive"),
        category: "insufficient_fee",
      }

    if (
      balance &&
      feeEstimate &&
      existentialDeposit?.planck &&
      amountToStake.planck &&
      existentialDeposit.planck + amountToStake.planck + feeEstimate * 10n >
        balance.transferable.planck // 10x fee for future unbonding, as max button accounts for 11x with a fake fee estimate
    )
      return {
        message: t(
          "Insufficient balance to cover staking, the existential deposit, and the future unbonding and withdrawal fees"
        ),
        category: "insufficient_balance",
      }

    if (!hasJoinedNomPool && amountToStake.planck < minJoinBond)
      return {
        message: t("Minimum bond is {{amount}} {{symbol}}", {
          amount: new BalanceFormatter(minJoinBond, token?.decimals).tokens,
          symbol: token?.symbol,
        }),
        category: "input_invalid",
      }

    return null
  }, [
    t,
    currentPoolId,
    poolState,
    amountToStake,
    minJoinBond,
    balance,
    feeEstimate,
    existentialDeposit?.planck,
    hasJoinedNomPool,
    token?.decimals,
    token?.symbol,
  ])

  const inputErrorMessage = inputError?.message ?? null

  return {
    account,
    token,
    tokenRates,
    poolId,
    amountToStake,
    displayMode,
    accountPicker,
    isFormValid,
    step,
    hash,
    feeToken,
    maxPlancks,
    inputErrorMessage,
    inputErrorCategory: inputError?.category,
    bondType,

    payload: !inputErrorMessage && isFormValid ? payload : null,
    txMetadata,
    isLoadingPayload: isLoadingPayload,
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

export const [BondWizardProvider, useBondWizard] = provideContext(useBondWizardProvider)
