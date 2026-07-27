import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { BalanceFormatter, getBalanceId } from "@talismn/balances"
import { useBittensorStakingPayload } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPayload"
import { useBittensorStakingPositions } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPositions"
import {
  effectiveLockedAmount,
  getDTaoSubnetUnstakeInfo,
} from "@ui/domains/Staking/Bittensor/utils/dtaoSubnetUnstakeInfo"
import { useGetBittensorColdkeyLock } from "@ui/domains/Staking/hooks/bittensor/useGetBittensorColdkeyLock"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useSubnetTokens } from "@ui/domains/TaoDashboard/hooks/useSubnetTokens"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { type BalancesByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useBalances } from "@ui/state/balances"
import { provideContext } from "@ui/util/provideContext"
import { merge } from "lodash-es"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import { useMevShieldFeeEstimate } from "./useMevShieldFeeEstimate"
import { useSwapSubmit } from "./useSwapSubmit"

type SwapSellInputs = {
  positionId: string | null
  valueIn: bigint | null
}

const DEFAULT_INPUTS: SwapSellInputs = {
  positionId: null,
  valueIn: null,
}

const useSwapSellProvider = ({ netuid }: { netuid: number }) => {
  const { t } = useTranslation()

  const positions = useBittensorStakingPositions(BITTENSOR_NETWORK_ID)
  const subnetPositions = useMemo(
    () => positions.filter((position) => position.token.netuid === netuid),
    [positions, netuid]
  )

  const [state, setState] = useState<SwapSellInputs>(
    // preselect position straight up to prevent flickering
    () => merge({}, DEFAULT_INPUTS, { positionId: subnetPositions[0]?.id ?? null })
  )
  useEffect(() => {
    if (!subnetPositions.length) {
      setState((prev) => (prev.positionId ? { ...prev, positionId: null } : prev))
      return
    }

    if (!state.positionId || !subnetPositions.some((p) => p.id === state.positionId)) {
      setState((prev) => ({ ...prev, positionId: subnetPositions[0].id }))
    }
  }, [state.positionId, subnetPositions])

  const selectedPosition = useMemo(
    () => subnetPositions.find((position) => position.id === state.positionId) ?? null,
    [subnetPositions, state.positionId]
  )

  const account = selectedPosition?.account ?? null

  const tokenIn = selectedPosition?.token ?? null
  const tokenIdIn = tokenIn?.id ?? null

  const { taoTokenId: tokenIdOut, taoToken: tokenOut } = useSubnetTokens(netuid)

  const address = selectedPosition?.balance.address ?? null
  const hotkey = tokenIn?.hotkey ?? null

  const balancesProps = useMemo(
    (): BalancesByParamsProps =>
      address
        ? {
            addressesAndTokens: {
              addresses: [address],
              tokenIds: [tokenIdOut, tokenIdIn ?? ""].filter(Boolean),
            },
          }
        : { addressesAndTokens: undefined },
    [address, tokenIdOut, tokenIdIn]
  )

  const { balances } = useBalancesByParams(balancesProps)

  const balanceTokenIn = useMemo(() => {
    if (!address || !tokenIdIn) return null
    return balances.get(getBalanceId({ address, tokenId: tokenIdIn })) ?? null
  }, [balances, address, tokenIdIn])

  const balanceTokenOut = useMemo(() => {
    if (!address || !tokenIdOut) return null
    return balances.get(getBalanceId({ address, tokenId: tokenIdOut })) ?? null
  }, [balances, address, tokenIdOut])

  // conviction locks constrain the coldkey's TOTAL alpha on the subnet:
  // this position's sellable amount is min(position stake, subnet-wide available)
  const allBalances = useBalances("owned")
  const subnetUnstakeInfo = useMemo(
    () =>
      address ? getDTaoSubnetUnstakeInfo(allBalances, address, BITTENSOR_NETWORK_ID, netuid) : null,
    [allBalances, address, netuid]
  )

  // The cached lock (balances poll every ~6s) can lag a lock that GROWS on-chain (owner auto-lock
  // every block, or a concurrent top-up). Read it fresh so the sellable guard tightens before
  // signing, avoiding a StakeUnavailable revert.
  const { data: freshLockedMass } = useGetBittensorColdkeyLock({
    networkId: BITTENSOR_NETWORK_ID,
    address,
    netuid,
  })

  // guard with the larger of cached vs fresh lock (a lock can only ever constrain unstaking more)
  const effectiveLocked = useMemo(
    () => effectiveLockedAmount(subnetUnstakeInfo?.convictionLock?.amount ?? 0n, freshLockedMass),
    [subnetUnstakeInfo?.convictionLock?.amount, freshLockedMass]
  )

  const maxValueIn = useMemo(() => {
    if (!balanceTokenIn) return 0n
    const stake = balanceTokenIn.free.planck
    const stakedTotal = subnetUnstakeInfo?.stakedTotal ?? stake
    const subnetAvailable = stakedTotal > effectiveLocked ? stakedTotal - effectiveLocked : 0n
    return stake < subnetAvailable ? stake : subnetAvailable
  }, [balanceTokenIn, subnetUnstakeInfo?.stakedTotal, effectiveLocked])

  const onValueChange = useCallback((value: bigint | null) => {
    setState((prev) => ({ ...prev, valueIn: value }))
  }, [])

  const onPositionChange = useCallback((positionId: string) => {
    setState((prev) => ({ ...prev, positionId, valueIn: null }))
  }, [])

  const resetValueIn = useCallback(() => {
    setState((prev) => ({ ...prev, valueIn: null }))
  }, [])

  const {
    isMevShieldDisabled,
    isMevShieldFeatureDisabled,
    withMevShield,
    setIsMevProtectionEnabled,
    txMode,
    onSubmit,
  } = useSwapSubmit({ netuid, account, direction: "sell", resetValueIn })

  const { data: sapi } = useScaleApi(BITTENSOR_NETWORK_ID)

  const {
    payload,
    feeEstimatePayload,
    txMetadata,
    amountOut: valueOut,
    priceImpact,
    isLoading,
    isError,
    slippage,
    minAlphaBond,
    minAlphaUnstake,
    swapPrice,
    talismanFee,
  } = useBittensorStakingPayload({
    netuid,
    amountIn: state.valueIn,
    direction: "alphaToTao",
    hotkey,
    address,
    networkId: BITTENSOR_NETWORK_ID,
    remarkType: "swap",
  })

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!tokenIdIn || typeof state.valueIn !== "bigint" || typeof valueOut !== "bigint" || !hotkey)
      return undefined

    return {
      type: "bittensor-staking",
      fromTokenId: tokenIdIn,
      toTokenId: tokenIdOut,
      fromAmount: state.valueIn.toString(),
      toAmount: valueOut.toString(),
      hotkey,
    }
  }, [tokenIdIn, tokenIdOut, state.valueIn, valueOut, hotkey])

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload: feeEstimatePayload })

  const {
    data: mevShieldFeeEstimate,
    isLoading: isLoadingMevShieldFee,
    error: errorMevShieldFee,
  } = useMevShieldFeeEstimate({
    sapi,
    address,
    innerFeeEstimatePayload: feeEstimatePayload,
    enabled: !isMevShieldDisabled,
  })

  const combinedFeeEstimate = useMemo(() => {
    if (typeof feeEstimate !== "bigint") return feeEstimate
    if (!withMevShield) return feeEstimate
    if (typeof mevShieldFeeEstimate !== "bigint") return feeEstimate
    return feeEstimate + mevShieldFeeEstimate
  }, [feeEstimate, mevShieldFeeEstimate, withMevShield])

  // Bittensor's runtime can pay unstake fees from staked Alpha when free TAO is insufficient,
  // but only when the Alpha fee mechanism is active on-chain.
  // This check is in preparation of https://github.com/opentensor/subtensor/pull/2353 and can be removed after release
  const supportsAlphaFees = useMemo(
    () => !!sapi?.hasEvent("SubtensorModule", "TransactionFeePaidWithAlpha"),
    [sapi]
  )

  const inputErrorMessage = useMemo(() => {
    if (!tokenIn || typeof state.valueIn !== "bigint" || !balanceTokenIn) return null

    if (state.valueIn > maxValueIn) {
      // the conviction locked stake cannot be unstaked (chain would throw StakeUnavailable)
      return effectiveLocked > 0n && state.valueIn <= balanceTokenIn.free.planck
        ? t("Exceeds unlocked stake: {{amount}} {{symbol}} is locked", {
            amount: new BalanceFormatter(effectiveLocked, tokenIn.decimals).tokens,
            symbol: tokenIn.symbol,
          })
        : t("Insufficient balance")
    }

    if (
      !supportsAlphaFees &&
      typeof combinedFeeEstimate === "bigint" &&
      balanceTokenOut &&
      combinedFeeEstimate > balanceTokenOut.transferable.planck
    )
      return t("Insufficient TAO to cover fee")

    if (typeof minAlphaUnstake === "bigint" && state.valueIn < minAlphaUnstake)
      return t("Minimum unbond is {{amount}} {{symbol}}", {
        amount: new BalanceFormatter(minAlphaUnstake, tokenIn.decimals).tokens,
        symbol: tokenIn.symbol,
      })

    // Leaving a stake below the chain's minimum (NominatorMinRequiredStake) triggers an automatic
    // unstake of the remainder (clear_small_nomination), which also releases any conviction lock.
    // This is fine at max (the remainder is the locked amount, which the chain sweeps to fully exit),
    // but a partial sell landing in that range would unexpectedly close the position: block it.
    const remaining = balanceTokenIn.free.planck - state.valueIn
    if (
      typeof minAlphaBond === "bigint" &&
      state.valueIn < maxValueIn &&
      remaining > 0n &&
      remaining < minAlphaBond
    )
      return t("Unstake everything or keep at least {{amount}} {{symbol}}", {
        amount: new BalanceFormatter(minAlphaBond, tokenIn.decimals).tokens,
        symbol: tokenIn.symbol,
      })

    return null
  }, [
    supportsAlphaFees,
    balanceTokenIn,
    balanceTokenOut,
    combinedFeeEstimate,
    maxValueIn,
    effectiveLocked,
    minAlphaBond,
    minAlphaUnstake,
    state.valueIn,
    t,
    tokenIn,
  ])

  const isValid = typeof state.valueIn === "bigint" && state.valueIn > 0n && !inputErrorMessage

  const canSubmit = !!payload && isValid

  return {
    netuid,
    positions: subnetPositions,
    selectedPosition,
    onPositionChange,

    tokenIn,
    tokenIdIn,
    tokenOut,
    tokenIdOut,
    balanceTokenIn,
    balanceTokenOut,
    valueIn: state.valueIn,
    maxValueIn,
    valueOut,
    taoToken: tokenOut,
    dtaoToken: tokenIn,

    talismanFee,
    swapPrice,
    priceImpact,
    slippage,
    isLoading,
    isError,

    withMevShield,
    isMevShieldDisabled,
    isMevShieldFeatureDisabled,
    setIsMevProtectionEnabled,

    feeEstimate: combinedFeeEstimate,
    innerFeeEstimate: feeEstimate,
    mevShieldFeeEstimate,
    isLoadingFeeEstimate:
      isLoading || isLoadingFeeEstimate || (withMevShield && isLoadingMevShieldFee),
    errorFeeEstimate: errorFeeEstimate || (withMevShield ? errorMevShieldFee : null),

    inputErrorMessage,
    canSubmit,
    payload,
    txMetadata,
    txInfo,
    txMode,
    onSubmit,

    onValueChange,
  }
}

export const [SwapSellProvider, useSwapSell] = provideContext(useSwapSellProvider)
