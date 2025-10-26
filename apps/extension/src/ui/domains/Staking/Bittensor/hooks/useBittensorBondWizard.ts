import { bind } from "@react-rxjs/core"
import { Balance, BalanceFormatter, Balances, getBalanceId } from "@talismn/balances"
import { parseTokenId, subNativeTokenId, TokenId } from "@talismn/chaindata-provider"
import { planckToTokens, tokensToPlanck } from "@talismn/util"
import { Address } from "extension-core"
import { SetStateAction, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { BehaviorSubject } from "rxjs"
import { Hex } from "viem"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccountByAddress, usePortfolioBalances, useToken, useTokenRates } from "@ui/state"

import { useExistentialDeposit } from "../../../../hooks/useExistentialDeposit"
import { useFeeToken } from "../../../SendFunds/useFeeToken"
import { useCombinedSubnetData } from "../../hooks/bittensor/dTao/useCombinedSubnetData"
import { DEFAULT_USER_MAX_SLIPPAGE, ROOT_NETUID } from "../utils/constants"
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
  hotkey: string | null
  netuid: number | null
  plancks: bigint | null
  displayMode: "token" | "fiat"
  isAccountPickerOpen: boolean
  isSelectStakeDrawerOpen: boolean
  isSlippageDrawerOpen: boolean
  isWarningDrawerOpen: boolean
  isSeekDiscountDrawerOpen: boolean
  hash: Hex | null
  stakeType: StakeType
  stakeDirection: StakeDirection
  userMaxSlippage: number
}

type WizardOpenOptions = {
  stakeDirection: StakeDirection
  step: WizardStep
  tokenId: TokenId
  netuid: number | null | undefined // known only if unstaking
  address?: Address
  hotkey?: string
  isSeekDiscountDrawerOpen?: boolean
  isSelectStakeDrawerOpen?: boolean
  stakeType?: StakeType
}

const DEFAULT_STATE: WizardState = {
  step: "form",
  address: null,
  tokenId: null,
  hotkey: null,
  netuid: null,
  plancks: null,
  displayMode: "token",
  isAccountPickerOpen: false,
  isSelectStakeDrawerOpen: false,
  isSlippageDrawerOpen: false,
  isWarningDrawerOpen: false,
  isSeekDiscountDrawerOpen: false,
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
  | "isSeekDiscountDrawerOpen"
  | "isSelectStakeDrawerOpen"

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
    (init: WizardOpenOptions) => setWizardState(Object.assign({}, DEFAULT_STATE, init)),
    [],
  )

  return reset
}

const useNativeTokenId = (dtaoTokenId: TokenId | null) => {
  return useMemo(() => {
    if (!dtaoTokenId) return null
    const parsed = parseTokenId(dtaoTokenId)
    return subNativeTokenId(parsed.networkId)
  }, [dtaoTokenId])
}

const useBalance = (
  allBalances: Balances,
  address: Address | null | undefined,
  tokenId: TokenId | null | undefined,
): Balance | null => {
  return useMemo(() => {
    if (!address || !tokenId) return null
    return allBalances.get(getBalanceId({ tokenId, address })) ?? null
  }, [allBalances, address, tokenId])
}

export const useBittensorBondWizard = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()
  const { allBalances } = usePortfolioBalances()

  const { subnetData } = useCombinedSubnetData()

  const {
    hotkey,
    netuid,
    step,
    stakeType,
    displayMode,
    hash,
    tokenId: dTaoTokenId,
    address,
    plancks,
    userMaxSlippage,
    stakeDirection,
  } = useWizardState()

  const dtaoBalance = useBalance(allBalances, address, dTaoTokenId)
  const nativeTokenId = useNativeTokenId(dTaoTokenId)
  const nativeBalance = useBalance(allBalances, address, nativeTokenId)
  const account = useAccountByAddress(address)
  const nativeToken = useToken(nativeTokenId)
  const dtaoToken = useToken(dTaoTokenId)
  const feeToken = useFeeToken(nativeToken?.id)
  const tokenRates = useTokenRates(nativeTokenId)
  const existentialDeposit = useExistentialDeposit(nativeToken?.id)
  const accountPicker = useInnerOpenClose("isAccountPickerOpen")
  const selectStakeDrawer = useInnerOpenClose("isSelectStakeDrawerOpen")
  const slippageDrawer = useInnerOpenClose("isSlippageDrawerOpen")
  const warningDrawer = useInnerOpenClose("isWarningDrawerOpen")
  const seekDiscountDrawer = useInnerOpenClose("isSeekDiscountDrawerOpen")

  const { data: sapi } = useScaleApi(nativeToken?.networkId)

  const {
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    errorFeeEstimate,
    isLoadingFeeEstimate,
    currentHotkey,
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
    hotkey,
    netuid,
    plancks,
    networkId: nativeToken?.networkId,
    stakeType,
    userMaxSlippage,
    //selectedStake,
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
            nativeToken?.decimals,
            tokenRates,
          )
        : null,
    [isSubnetUnbond, plancks, taoAmountFromAlpha, nativeToken?.decimals, tokenRates],
  )

  const amountToStakeAlpha = useMemo(
    () =>
      typeof plancks === "bigint"
        ? new BalanceFormatter(plancks, nativeToken?.decimals, tokenRates)
        : null,
    [plancks, nativeToken?.decimals, tokenRates],
  )

  // estimatedAmountToStakeInTao includes slippage
  const estimatedAmountToStake = useMemo(() => {
    const expectedTaoWithSlippagePlancks =
      tokensToPlanck(String(expectedTaoWithSlippage), nativeToken?.decimals) || "0"
    return typeof plancks === "bigint"
      ? new BalanceFormatter(
          isSubnetUnbond ? BigInt(Math.round(parseFloat(expectedTaoWithSlippagePlancks))) : plancks,
          nativeToken?.decimals,
          tokenRates,
        )
      : null
  }, [expectedTaoWithSlippage, isSubnetUnbond, plancks, nativeToken?.decimals, tokenRates])

  const setAddress = useCallback(
    (address: Address) => setWizardState((prev) => ({ ...prev, address })),
    [],
  )

  const setTokenId = useCallback(
    (tokenId: TokenId) => setWizardState((prev) => ({ ...prev, tokenId })),
    [],
  )

  const setHotkey = useCallback(
    (hotkey: string) => setWizardState((prev) => ({ ...prev, hotkey })),
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
      !!nativeToken &&
      !!hotkey &&
      (stakeType === "root" ? true : !!netuid) &&
      !!amountToStake &&
      typeof minJoinBond === "bigint" &&
      plancks &&
      plancks > 0n,
    [account, amountToStake, minJoinBond, netuid, plancks, hotkey, stakeType, nativeToken],
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
    if (!!currentHotkey && !hotkey && currentHotkey !== hotkey && stakeDirection === "bond") {
      setWizardState((prev) => ({ ...prev, hotkey: currentHotkey }))
    }
  }, [currentHotkey, hotkey, stakeDirection, step])

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
      genericEvent("Bittensor Bond", { tokenId: nativeTokenId })
      if (hash) setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [genericEvent, nativeTokenId],
  )

  const totalStakedPlancks = useMemo(
    () => dtaoBalance?.free.planck ?? 0n, // dtaoBalance.sum.planck, // BigInt(selectedStake?.meta.amountStaked || 0),
    [dtaoBalance?.free.planck],
  )

  const maxPlancks = useMemo(() => {
    if (stakeDirection === "unbond") {
      return totalStakedPlancks
    }
    if (!nativeBalance || !existentialDeposit || !feeEstimate) return null
    if (existentialDeposit.planck + feeEstimate * 11n > nativeBalance.transferable.planck)
      return null
    const maxRootStake =
      nativeBalance.transferable.planck - existentialDeposit.planck - feeEstimate * 11n
    if (stakeType === "subnet") {
      return maxRootStake - talismanFee
    }
    return maxRootStake
  }, [
    nativeBalance,
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
          Number(tokensToPlanck(String(expectedAlphaWithSlippage), nativeToken?.decimals) || "0"),
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
    nativeToken?.decimals,
    totalStakedPlancks,
  ])

  const stakeInputErrorMessage = useMemo(() => {
    if (!amountToStake || typeof minJoinBond !== "bigint") return null

    if (
      !!nativeBalance &&
      !!amountToStake.planck &&
      amountToStake.planck > nativeBalance.transferable.planck
    )
      return t("Insufficient balance")

    if (
      !!nativeBalance &&
      !!feeEstimate &&
      !!amountToStake.planck &&
      amountToStake.planck + feeEstimate > nativeBalance.transferable.planck
    )
      return t("Insufficient balance to cover fee")

    if (
      !!nativeBalance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      !!amountToStake.planck &&
      existentialDeposit.planck + amountToStake.planck + feeEstimate >
        nativeBalance.transferable.planck
    )
      return t("Insufficient balance to cover fee and keep account alive")

    if (
      !!nativeBalance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      !!amountToStake.planck &&
      existentialDeposit.planck + amountToStake.planck + feeEstimate * 10n >
        nativeBalance.transferable.planck // 10x fee for future unbonding, as max button accounts for 11x with a fake fee estimate
    )
      return t(
        "Insufficient balance to cover staking, the existential deposit, and the future unbonding and withdrawal fees",
      )

    if (amountToStake.planck < minJoinBond)
      return t("Minimum bond is {{amount}} {{symbol}}", {
        amount: new BalanceFormatter(minJoinBond, nativeToken?.decimals).tokens,
        symbol: nativeToken?.symbol,
      })

    return null
  }, [
    t,
    amountToStake,
    minJoinBond,
    nativeBalance,
    feeEstimate,
    existentialDeposit?.planck,
    nativeToken?.decimals,
    nativeToken?.symbol,
  ])

  const unstakeInputErrorMessage = useMemo(() => {
    if (
      !!nativeBalance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      existentialDeposit.planck + feeEstimate > nativeBalance.transferable.planck
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
      Number(planckToTokens(plancks?.toString(), nativeToken?.decimals)) < minAlphaUnstake &&
      isSubnetUnbond
    ) {
      return t(
        `Minimum unstake amount is ${minAlphaUnstake.toFixed(4)} ${
          dtaoBalance?.token?.symbol
          // selectedStake?.meta?.dynamicInfo?.tokenSymbol
        }`,
      )
    }

    return null
  }, [
    nativeBalance,
    feeEstimate,
    existentialDeposit?.planck,
    plancks,
    totalStakedPlancks,
    newStakeTotal,
    minJoinBond,
    isSubnetUnbond,
    nativeToken?.decimals,
    minAlphaUnstake,
    t,
    dtaoBalance?.token?.symbol,
  ])

  const inputErrorMessage = useMemo(
    () => (stakeDirection === "bond" ? stakeInputErrorMessage : unstakeInputErrorMessage),
    [stakeDirection, stakeInputErrorMessage, unstakeInputErrorMessage],
  )

  return {
    account,
    nativeToken,
    dtaoToken,
    tokenRates,
    hotkey,
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
    seekDiscountDrawer,
    isFormValid,
    isSlippageValid,
    step,
    hash,
    feeToken,
    maxPlancks,
    inputErrorMessage,
    stakeDirection,
    // selectedStake,
    dtaoBalance,
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
    setHotkey,
    setPlancks,
    setStep,
    setStakeType,
    toggleDisplayMode,
    setUserMaxSlippage,

    onSubmitted,
  }
}
