import { Balance, BalanceFormatter, Balances, getBalanceId } from "@talismn/balances"
import {
  DotNetworkId,
  subDTaoTokenId,
  subNativeTokenId,
  TokenId,
} from "@talismn/chaindata-provider"
import { Address, isAccountOfType } from "extension-core"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { BehaviorSubject } from "rxjs"
import { useOpenClose } from "talisman-ui"
import { Hex } from "viem"

import { provideContext } from "@talisman/util/provideContext"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccountByAddress, usePortfolioBalances, useToken, useTokenRates } from "@ui/state"

import { useExistentialDeposit } from "../../../../hooks/useExistentialDeposit"
import { useFeeToken } from "../../../SendFunds/useFeeToken"
import { ROOT_NETUID } from "../utils/constants"
import {
  BittensorStakingPosition,
  useBittensorStakingPositions,
} from "./useBittensorStakingPositions"
import { useGetBittensorStakeInfo } from "./useGetBittensorStakeInfo"

export type WizardStep =
  | "form"
  | "review"
  | "follow-up"
  | "select-delegate"
  | "select-subnet"
  | "select-position"
export type StakeType = "root" | "subnet"
export type StakeDirection = "bond" | "unbond"

type WizardState = {
  step: WizardStep
  networkId: DotNetworkId
  address: Address | null
  hotkey: string | null
  netuid: number | null
  amountIn: bigint | null
  displayMode: "token" | "fiat"
  hash: Hex | null
  stakeType: StakeType | null
  stakeDirection: StakeDirection
}

export type BittensorStakingWizardOpenOptions = {
  stakeDirection: StakeDirection
  networkId: DotNetworkId
  netuid?: number
  address?: Address
  hotkey?: string
}

const DEFAULT_STATE: WizardState = {
  step: "form",
  address: null,
  networkId: "bittensor",
  hotkey: null,
  netuid: null,
  amountIn: null,
  displayMode: "token",
  hash: null,
  stakeType: null,
  stakeDirection: "bond",
}

const wizardOpenState$ = new BehaviorSubject(DEFAULT_STATE)

export const useResetBittensorBondWizard = () => {
  const reset = useCallback((init: BittensorStakingWizardOpenOptions) => {
    const stakeType =
      typeof init.netuid === "number" ? (init.netuid === 0 ? "root" : "subnet") : null
    wizardOpenState$.next(Object.assign({}, DEFAULT_STATE, init, { stakeType }))
  }, [])

  return reset
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

const useDtaoToken = (networkId: string, netuid: number, hotkey?: string) => {
  // use the dynamic token if user already has a balance
  const tokenWithHotkey = useToken(
    useMemo(() => subDTaoTokenId(networkId, netuid, hotkey), [networkId, netuid, hotkey]),
    "substrate-dtao",
  )
  // otherwise the template token (without hotkey)
  const tokenWithoutHotkey = useToken(
    useMemo(() => subDTaoTokenId(networkId, netuid), [networkId, netuid]),
    "substrate-dtao",
  )

  return tokenWithHotkey || tokenWithoutHotkey
}

const useBittensorBondWizardProvider = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()
  const { allBalances } = usePortfolioBalances()

  const [
    {
      networkId,
      address,
      netuid,
      hotkey,
      step,
      stakeType,
      displayMode,
      hash,
      amountIn,
      stakeDirection,
    },
    setWizardState,
  ] = useState(() => wizardOpenState$.getValue())
  const nativeTokenId = useMemo(() => (networkId ? subNativeTokenId(networkId) : null), [networkId])
  const dtaoToken = useDtaoToken(networkId ?? "", netuid ?? 0, hotkey ?? undefined)
  const [isMevProtectionEnabled, setIsMevProtectionEnabled] = useState(false)

  const dtaoBalance = useBalance(allBalances, address, dtaoToken?.id)
  const nativeBalance = useBalance(allBalances, address, nativeTokenId)
  const account = useAccountByAddress(address)
  const nativeToken = useToken(nativeTokenId, "substrate-native")
  const feeToken = useFeeToken(nativeToken?.id)
  const tokenRates = useTokenRates(nativeTokenId)
  const existentialDeposit = useExistentialDeposit(nativeToken?.id)
  const accountPicker = useOpenClose()
  const stakeTypeDrawer = useOpenClose()
  const slippageDrawer = useOpenClose()
  const warningDrawer = useOpenClose()
  const seekDiscountDrawer = useOpenClose()

  const { data: sapi } = useScaleApi(nativeToken?.networkId)

  const isMevShieldDisabled = useMemo(() => {
    // no need for root staking
    // supported only for hot wallets
    return !netuid || !isAccountOfType(account, "keypair")
  }, [netuid, account])

  const withMevShield = useMemo(
    () => !isMevShieldDisabled && isMevProtectionEnabled,
    [isMevShieldDisabled, isMevProtectionEnabled],
  )

  const {
    alphaPrice,
    swapPrice,
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    errorFeeEstimate,
    isLoadingFeeEstimate,
    currentHotkey,
    minTaoBond,
    minAlphaBond,
    minTaoStake,
    minAlphaUnstake,
    priceImpact,
    talismanFee,
    slippage,
    amountOut,
  } = useGetBittensorStakeInfo({
    sapi,
    address,
    hotkey,
    netuid,
    amountIn,
    networkId: nativeToken?.networkId,
    stakeDirection,
  })

  const isSubnetUnbond = useMemo(
    () => stakeDirection === "unbond" && netuid !== ROOT_NETUID,
    [netuid, stakeDirection],
  )

  const amountTao = useMemo(
    () =>
      typeof amountIn === "bigint"
        ? new BalanceFormatter(
            isSubnetUnbond ? amountOut : amountIn,
            nativeToken?.decimals,
            tokenRates,
          )
        : null,
    [amountIn, isSubnetUnbond, amountOut, nativeToken?.decimals, tokenRates],
  )

  const amountAlpha = useMemo(
    () =>
      typeof amountIn === "bigint"
        ? new BalanceFormatter(
            isSubnetUnbond ? amountIn : amountOut,
            nativeToken?.decimals,
            tokenRates,
          )
        : null,
    [amountIn, amountOut, isSubnetUnbond, nativeToken?.decimals, tokenRates],
  )

  const setAddress = useCallback(
    (address: Address) => setWizardState((prev) => ({ ...prev, address })),
    [],
  )

  const setHotkey = useCallback(
    (hotkey: string) => setWizardState((prev) => ({ ...prev, hotkey })),
    [],
  )
  const setNetuid = useCallback(
    (netuid: number) =>
      setWizardState((prev) => ({ ...prev, netuid, stakeType: netuid ? "subnet" : "root" })),
    [],
  )

  const setPlancks = useCallback(
    (plancks: bigint | null) => setWizardState((prev) => ({ ...prev, amountIn: plancks })),
    [],
  )

  const setStakeType = useCallback(
    (stakeType: StakeType) => {
      setWizardState((prev) => ({
        ...prev,
        stakeType,
        netuid: stakeType === "root" ? 0 : prev.netuid || null,
      }))
      stakeTypeDrawer.close()
    },
    [stakeTypeDrawer],
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
      !!amountTao &&
      typeof minTaoBond === "bigint" &&
      amountIn &&
      amountIn > 0n,
    [account, amountTao, minTaoBond, netuid, amountIn, hotkey, stakeType, nativeToken],
  )

  const isUnstakeFormValid = useMemo(() => amountIn && amountIn > 0n, [amountIn])

  const isFormValid = useMemo(
    () => (stakeDirection === "bond" ? isStakeFormValid : isUnstakeFormValid),
    [isStakeFormValid, isUnstakeFormValid, stakeDirection],
  )

  useEffect(() => {
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

  const setPosition = useCallback((position: BittensorStakingPosition) => {
    if (!position.token.hotkey) return
    setWizardState((prev) => {
      return {
        ...prev,
        step: "form",
        networkId: position.token.networkId,
        hotkey: position.token.hotkey!,
        netuid: position.token.netuid,
        address: position.balance.address,
        stakeType: position.token.netuid === 0 ? "root" : "subnet",
      }
    })
  }, [])

  const onSubmitted = useCallback(
    (hash: Hex) => {
      genericEvent("Bittensor Bond", { tokenId: nativeTokenId })
      if (hash) setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [genericEvent, nativeTokenId],
  )

  const totalStakedPlancks = useMemo(
    () => dtaoBalance?.free.planck ?? 0n,
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
    return maxRootStake
  }, [stakeDirection, nativeBalance, existentialDeposit, feeEstimate, totalStakedPlancks])

  const newStakeTotal = useMemo(() => {
    if (stakeDirection === "unbond") {
      return totalStakedPlancks - (amountIn || 0n)
    }
    if (stakeType === "subnet") {
      return totalStakedPlancks + amountOut
    }
    return totalStakedPlancks + (amountIn || 0n)
  }, [amountOut, amountIn, stakeDirection, stakeType, totalStakedPlancks])

  const stakeInputErrorMessage = useMemo(() => {
    if (!amountTao || typeof minTaoBond !== "bigint") return null

    if (
      !!nativeBalance &&
      !!amountTao.planck &&
      amountTao.planck > nativeBalance.transferable.planck
    )
      return t("Insufficient balance")

    if (
      !!nativeBalance &&
      !!feeEstimate &&
      !!amountTao.planck &&
      amountTao.planck + feeEstimate > nativeBalance.transferable.planck
    )
      return t("Insufficient balance to cover fee")

    if (
      !!nativeBalance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      !!amountTao.planck &&
      existentialDeposit.planck + amountTao.planck + feeEstimate > nativeBalance.transferable.planck
    )
      return t("Insufficient balance to cover fee and keep account alive")

    if (
      !!nativeBalance &&
      !!feeEstimate &&
      !!existentialDeposit?.planck &&
      !!amountTao.planck &&
      existentialDeposit.planck + amountTao.planck + feeEstimate * 10n >
        nativeBalance.transferable.planck // 10x fee for future unbonding, as max button accounts for 11x with a fake fee estimate
    )
      return t(
        "Insufficient balance to cover staking, the existential deposit, and the future unbonding and withdrawal fees",
      )

    // if not staking yet, need minTaoBond or more
    if (!dtaoBalance?.free.planck && amountTao.planck < minTaoBond)
      return t("Minimum bond is {{amount}} {{symbol}}", {
        amount: new BalanceFormatter(minTaoBond, nativeToken?.decimals).tokens,
        symbol: nativeToken?.symbol,
      })

    // no staking operation can be less than minTaoStake
    if (amountTao.planck < minTaoStake)
      return t("Minimum bond is {{amount}} {{symbol}}", {
        amount: new BalanceFormatter(minTaoStake, nativeToken?.decimals).tokens,
        symbol: nativeToken?.symbol,
      })

    return null
  }, [
    amountTao,
    minTaoBond,
    nativeBalance,
    t,
    feeEstimate,
    existentialDeposit?.planck,
    dtaoBalance?.free.planck,
    nativeToken?.decimals,
    nativeToken?.symbol,
    minTaoStake,
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
    if ((amountIn || 0n) > totalStakedPlancks) {
      return t("Insufficient balance")
    }
    if (
      newStakeTotal < (minAlphaBond || 0n) &&
      newStakeTotal !== 0n &&
      !isSubnetUnbond &&
      (amountIn || 0n) > 0n
    ) {
      return t("You must keep 0.1 TAO to continue staking")
    }

    // no staking operation can be less than minTaoStake
    if (amountAlpha?.planck && minAlphaUnstake && amountAlpha.planck < minAlphaUnstake)
      return t("Minimum unbond is {{amount}} {{symbol}}", {
        amount: new BalanceFormatter(minAlphaUnstake, dtaoToken?.decimals).tokens,
        symbol: dtaoToken?.symbol,
      })

    return null
  }, [
    nativeBalance,
    feeEstimate,
    existentialDeposit?.planck,
    amountIn,
    totalStakedPlancks,
    newStakeTotal,
    minAlphaBond,
    isSubnetUnbond,
    amountAlpha?.planck,
    minAlphaUnstake,
    t,
    dtaoToken?.decimals,
    dtaoToken?.symbol,
  ])

  const inputErrorMessage = useMemo(
    () => (stakeDirection === "bond" ? stakeInputErrorMessage : unstakeInputErrorMessage),
    [stakeDirection, stakeInputErrorMessage, unstakeInputErrorMessage],
  )

  // positions are used only when unstaking
  const positions = useBittensorStakingPositions(networkId)
  const position = useMemo(() => {
    return positions.find(
      (p) =>
        p.token.netuid === netuid &&
        p.token.hotkey === hotkey &&
        p.token.networkId === networkId &&
        p.balance.address === address,
    )
  }, [positions, netuid, hotkey, networkId, address])

  useEffect(() => {
    // if unstaking and no position selected, open position select step
    if (stakeDirection === "unbond" && step === "form" && !position) setStep("select-position")
  }, [stakeDirection, position, setStep, step])

  useEffect(() => {
    // on mount, if stake type is not set, display the stake type select drawer
    if (!stakeType && stakeDirection === "bond") stakeTypeDrawer.open()
  }, [stakeType, stakeDirection, stakeTypeDrawer])

  return {
    account,
    nativeToken,
    dtaoToken,
    tokenRates,
    networkId,
    hotkey,
    netuid,
    amountIn,
    amountTao,
    amountAlpha,
    displayMode,
    accountPicker,
    stakeTypeDrawer,
    slippageDrawer,
    warningDrawer,
    seekDiscountDrawer,
    isFormValid,
    step,
    hash,
    feeToken,
    maxPlancks,
    inputErrorMessage,
    stakeDirection,
    dtaoBalance,
    newStakeTotal,
    isSubnetUnbond,
    position,
    slippage,
    payload: !inputErrorMessage && isFormValid ? payload : null,
    txMetadata,
    isLoadingPayload: isLoadingPayload,
    errorPayload,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    stakeType,
    alphaPrice,
    swapPrice,
    talismanFee,
    amountOut,
    priceImpact,
    withMevShield,
    isMevShieldDisabled,
    setIsMevProtectionEnabled,
    setAddress,
    setNetuid,
    setHotkey,
    setPlancks,
    setStep,
    setStakeType,
    setPosition,
    toggleDisplayMode,
    onSubmitted,
  }
}

export const [BittensorBondWizardProvider, useBittensorBondWizard] = provideContext(
  useBittensorBondWizardProvider,
)
