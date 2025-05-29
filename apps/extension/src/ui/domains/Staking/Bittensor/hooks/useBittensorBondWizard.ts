import { bind } from "@react-rxjs/core"
import { TokenId } from "@talismn/chaindata-provider"
import { planckToTokens, tokensToPlanck } from "@talismn/util"
import { Address, BalanceFormatter } from "extension-core"
import { SetStateAction, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { BehaviorSubject } from "rxjs"
import { Hex } from "viem"

import { useTokenBalances } from "@ui/domains/Portfolio/AssetDetails/useTokenBalances"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccountByAddress, useBalance, usePortfolio, useToken, useTokenRates } from "@ui/state"

import { useExistentialDeposit } from "../../../../hooks/useExistentialDeposit"
import { useFeeToken } from "../../../SendFunds/useFeeToken"
import { useCombinedSubnetData } from "../../hooks/bittensor/dTao/useCombinedSubnetData"
import { BITTENSOR_TOKEN_ID, DEFAULT_USER_MAX_SLIPPAGE, ROOT_NETUID } from "../utils/constants"
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
export type StakeDirection = "bond" | "unbond"

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
  isSlippageDrawerOpen: boolean
  isWarningDrawerOpen: boolean
  hash: Hex | null
  stakeType: StakeType
  stakeDirection: StakeDirection
  userMaxSlippage: number
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
  isSlippageDrawerOpen: false,
  isWarningDrawerOpen: false,
  hash: null,
  stakeType: "root",
  stakeDirection: "bond",
  userMaxSlippage: DEFAULT_USER_MAX_SLIPPAGE,
}

const wizardState$ = new BehaviorSubject(DEFAULT_STATE)

const setWizardState = (state: SetStateAction<WizardState>) => {
  if (typeof state === "function") wizardState$.next(state(wizardState$.value))
  else wizardState$.next(state)
}

const [useWizardState] = bind(wizardState$)

type innerOpenCloseKey =
  | "isAccountPickerOpen"
  | "isSelectStakeDrawerOpen"
  | "isSlippageDrawerOpen"
  | "isWarningDrawerOpen"

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
        | "address"
        | "tokenId"
        | "poolId"
        | "step"
        | "isSelectStakeDrawerOpen"
        | "stakeType"
        | "netuid"
        | "stakeDirection"
      >,
    ) => setWizardState({ ...DEFAULT_STATE, ...init }),
    [],
  )

  return reset
}

export const useBittensorBondWizard = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()
  const { allBalances } = usePortfolio()

  const { subnetData } = useCombinedSubnetData()

  const tokenBalances = useTokenBalances({
    tokenId: BITTENSOR_TOKEN_ID,
    balances: allBalances,
  })

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
    userMaxSlippage,
    stakeDirection,
  } = useWizardState()

  const balance = useBalance(address, tokenId)
  const account = useAccountByAddress(address)
  const token = useToken(tokenId)
  const feeToken = useFeeToken(token?.id)
  const tokenRates = useTokenRates(tokenId)
  const existentialDeposit = useExistentialDeposit(token?.id)
  const accountPicker = useInnerOpenClose("isAccountPickerOpen")
  const selectStakeDrawer = useInnerOpenClose("isSelectStakeDrawerOpen")
  const slippageDrawer = useInnerOpenClose("isSlippageDrawerOpen")
  const warningDrawer = useInnerOpenClose("isWarningDrawerOpen")

  const { data: sapi } = useScaleApi(token?.chain?.id)

  // active stake position
  const selectedStake = useMemo(
    () =>
      tokenBalances.detailRows.find(
        ({ meta }) => meta?.hotkey === poolId && meta?.netuid === netuid,
      ),
    [netuid, poolId, tokenBalances.detailRows],
  )

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
    minAlphaUnstake,

    slippage,
    talismanFee,
    taoToAlphaConversionRate,
    taoAmountFromAlpha,
    expectedAlphaWithSlippage,
    expectedTaoWithSlippage,
    isDynamicInfoLoading,
    isDynamicInfoError,
  } = useGetBittensorStakeInfo({
    sapi,
    address,
    poolId,
    netuid,
    plancks,
    chainId: token?.chain?.id,
    stakeType,
    userMaxSlippage,
    selectedStake,
    stakeDirection,
  })

  const isSubnetUnbond = useMemo(
    () => stakeDirection === "unbond" && netuid !== ROOT_NETUID,
    [netuid, stakeDirection],
  )

  // currently selected subnet
  const selectedSubnet = useMemo(() => subnetData?.[netuid || 0] ?? {}, [netuid, subnetData])

  // amountToStakeInTao
  const amountToStake = useMemo(
    () =>
      typeof plancks === "bigint"
        ? new BalanceFormatter(
            isSubnetUnbond ? BigInt(Math.round(taoAmountFromAlpha)) : plancks,
            token?.decimals,
            tokenRates,
          )
        : null,
    [isSubnetUnbond, plancks, taoAmountFromAlpha, token?.decimals, tokenRates],
  )

  const amountToStakeAlpha = useMemo(
    () =>
      typeof plancks === "bigint"
        ? new BalanceFormatter(plancks, token?.decimals, tokenRates)
        : null,
    [plancks, token?.decimals, tokenRates],
  )

  // estimatedAmountToStakeInTao includes slippage
  const estimatedAmountToStake = useMemo(() => {
    const expectedTaoWithSlippagePlancks =
      tokensToPlanck(String(expectedTaoWithSlippage), token?.decimals) || "0"
    return typeof plancks === "bigint"
      ? new BalanceFormatter(
          isSubnetUnbond ? BigInt(Math.round(parseFloat(expectedTaoWithSlippagePlancks))) : plancks,
          token?.decimals,
          tokenRates,
        )
      : null
  }, [expectedTaoWithSlippage, isSubnetUnbond, plancks, token?.decimals, tokenRates])

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

  const setStakeType = useCallback(
    (stakeType: StakeType) => setWizardState((prev) => ({ ...prev, stakeType })),
    [],
  )

  const setUserMaxSlippage = useCallback(
    (userMaxSlippage: number) => setWizardState((prev) => ({ ...prev, userMaxSlippage })),
    [],
  )

  const toggleDisplayMode = useCallback(() => {
    setWizardState((prev) => ({
      ...prev,
      displayMode: prev.displayMode === "token" ? "fiat" : "token",
    }))
  }, [])

  const isStakeFormValid = useMemo(
    () =>
      !!account &&
      !!token &&
      !!poolId &&
      (stakeType === "root" ? true : !!netuid) &&
      !!amountToStake &&
      typeof minJoinBond === "bigint" &&
      plancks &&
      plancks > 0n,
    [account, amountToStake, minJoinBond, netuid, plancks, poolId, stakeType, token],
  )

  const isUnstakeFormValid = useMemo(() => plancks && plancks > 0n, [plancks])

  const isFormValid = useMemo(
    () => (stakeDirection === "bond" ? isStakeFormValid : isUnstakeFormValid),
    [isStakeFormValid, isUnstakeFormValid, stakeDirection],
  )

  const isSlippageValid = useMemo(() => userMaxSlippage >= slippage, [slippage, userMaxSlippage])

  useEffect(() => {
    /**
     * if user is already staking in pool, set poolId to that pool
     * If the user chooses to stake in a different pool, we should not set the poolId to the one the user is currently staking in
     */
    if (!!currentPoolId && !poolId && currentPoolId !== poolId && stakeDirection === "bond") {
      setWizardState((prev) => ({ ...prev, poolId: currentPoolId }))
    }
  }, [currentPoolId, poolId, stakeDirection, step, tokenId])

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

  const totalStakedPlancks = useMemo(
    () => BigInt(selectedStake?.meta.amountStaked || 0),
    [selectedStake?.meta.amountStaked],
  )

  const maxPlancks = useMemo(() => {
    if (stakeDirection === "unbond") {
      return totalStakedPlancks
    }
    if (!balance || !existentialDeposit || !feeEstimate) return null
    if (existentialDeposit.planck + feeEstimate * 11n > balance.transferable.planck) return null
    const maxRootStake = balance.transferable.planck - existentialDeposit.planck - feeEstimate * 11n
    if (stakeType === "subnet") {
      return maxRootStake - talismanFee
    }
    return maxRootStake
  }, [
    balance,
    existentialDeposit,
    feeEstimate,
    stakeDirection,
    stakeType,
    talismanFee,
    totalStakedPlancks,
  ])

  const newStakeTotal = useMemo(() => {
    if (stakeDirection === "unbond") {
      return totalStakedPlancks - (plancks || 0n)
    }
    if (stakeType === "subnet") {
      const expectedAlphaWithSlippagePlancks = BigInt(
        Math.round(
          Number(tokensToPlanck(String(expectedAlphaWithSlippage), token?.decimals) || "0"),
        ),
      )

      return totalStakedPlancks + (expectedAlphaWithSlippagePlancks || 0n)
    }
    return totalStakedPlancks + (plancks || 0n)
  }, [
    expectedAlphaWithSlippage,
    plancks,
    stakeDirection,
    stakeType,
    token?.decimals,
    totalStakedPlancks,
  ])

  const stakeInputErrorMessage = useMemo(() => {
    if (!amountToStake || typeof minJoinBond !== "bigint") return null

    if (!!balance && !!amountToStake.planck && amountToStake.planck > balance.transferable.planck)
      return t("Insufficient balance")

    if (
      !!balance &&
      !!feeEstimate &&
      !!amountToStake.planck &&
      amountToStake.planck + feeEstimate > balance.transferable.planck
    )
      return t("Insufficient balance to cover fee")

    if (
      !!balance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      !!amountToStake.planck &&
      existentialDeposit.planck + amountToStake.planck + feeEstimate > balance.transferable.planck
    )
      return t("Insufficient balance to cover fee and keep account alive")

    if (
      !!balance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      !!amountToStake.planck &&
      existentialDeposit.planck + amountToStake.planck + feeEstimate * 10n >
        balance.transferable.planck // 10x fee for future unbonding, as max button accounts for 11x with a fake fee estimate
    )
      return t(
        "Insufficient balance to cover staking, the existential deposit, and the future unbonding and withdrawal fees",
      )

    if (amountToStake.planck < minJoinBond)
      return t("Minimum bond is {{amount}} {{symbol}}", {
        amount: new BalanceFormatter(minJoinBond, token?.decimals).tokens,
        symbol: token?.symbol,
      })

    return null
  }, [
    t,
    amountToStake,
    minJoinBond,
    balance,
    feeEstimate,
    existentialDeposit?.planck,
    token?.decimals,
    token?.symbol,
  ])

  const unstakeInputErrorMessage = useMemo(() => {
    if (
      !!balance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      existentialDeposit.planck + feeEstimate > balance.transferable.planck
    ) {
      return t("Insufficient balance to cover fee and keep account alive")
    }
    if ((plancks || 0n) > totalStakedPlancks) {
      return t("Insufficient balance")
    }
    if (
      newStakeTotal < (minJoinBond || 0n) &&
      newStakeTotal !== 0n &&
      !isSubnetUnbond &&
      (plancks || 0n) > 0n
    ) {
      return t("You must keep 0.1 TAO to continue staking")
    }

    if (
      plancks &&
      Number(planckToTokens(plancks?.toString(), token?.decimals)) < minAlphaUnstake &&
      isSubnetUnbond
    ) {
      return t(
        `Minimum unstake amount is ${minAlphaUnstake.toFixed(4)} ${
          selectedStake?.meta?.dynamicInfo?.tokenSymbol
        }`,
      )
    }

    return null
  }, [
    balance,
    feeEstimate,
    existentialDeposit?.planck,
    plancks,
    totalStakedPlancks,
    newStakeTotal,
    minJoinBond,
    isSubnetUnbond,
    token?.decimals,
    minAlphaUnstake,
    t,
    selectedStake?.meta?.dynamicInfo?.tokenSymbol,
  ])

  const inputErrorMessage = useMemo(
    () => (stakeDirection === "bond" ? stakeInputErrorMessage : unstakeInputErrorMessage),
    [stakeDirection, stakeInputErrorMessage, unstakeInputErrorMessage],
  )

  return {
    account,
    token,
    tokenRates,
    poolId,
    netuid,
    plancks,
    amountToStake,
    estimatedAmountToStake,
    amountToStakeAlpha,
    displayMode,
    accountPicker,
    selectStakeDrawer,
    slippageDrawer,
    warningDrawer,
    isFormValid,
    isSlippageValid,
    step,
    hash,
    feeToken,
    maxPlancks,
    inputErrorMessage,
    stakeDirection,
    selectedStake,
    selectedSubnet,
    newStakeTotal,
    isSubnetUnbond,

    payload: !inputErrorMessage && isFormValid ? payload : null,
    txMetadata,
    isLoadingPayload: isLoadingPayload,
    errorPayload,

    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    stakeType,

    slippage,
    talismanFee,
    isDynamicInfoLoading,
    isDynamicInfoError,
    taoToAlphaConversionRate,
    expectedAlphaWithSlippage,
    expectedTaoWithSlippage,
    userMaxSlippage,
    taoAmountFromAlpha,

    setAddress,
    setTokenId,
    setNetuid,
    setPoolId,
    setPlancks,
    setStep,
    setStakeType,
    toggleDisplayMode,
    setUserMaxSlippage,

    onSubmitted,
  }
}
