import { tokenSymbolForAnalytics } from "@common/analytics/funds"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { BalanceFormatter, getBalanceId } from "@talismn/balances"
import { formatDecimals } from "@talismn/util"
import { useBittensorStakingPayload } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPayload"
import { useBittensorStakingPositions } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPositions"
import { useGetBittensorColdkeyLock } from "@ui/domains/Staking/Bittensor/hooks/useGetBittensorColdkeyLock"
import { useGetBittensorTransferableBalance } from "@ui/domains/Staking/Bittensor/hooks/useGetBittensorTransferableBalance"
import {
  effectiveLockedAmount,
  getDTaoSubnetUnstakeInfo,
} from "@ui/domains/Staking/Bittensor/utils/dtaoSubnetUnstakeInfo"
import { getSweepableRemainder } from "@ui/domains/Staking/Bittensor/utils/nominationRemainder"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useSubnetTokens } from "@ui/domains/TaoDashboard/hooks/useSubnetTokens"
import { type InlineError, useErrorShown } from "@ui/hooks/analytics/errorShown"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { type BalancesByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import { useBalances } from "@ui/state/balances"
import { provideContext } from "@ui/util/provideContext"
import { merge } from "lodash-es"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useTaoDashboardNetworkId } from "../../shared/TaoDashboardNetworkProvider"
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

  const networkId = useTaoDashboardNetworkId()
  const positions = useBittensorStakingPositions(networkId)
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

  const { taoTokenId: tokenIdOut, taoToken: tokenOut } = useSubnetTokens(networkId, netuid)

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

  // the balance pool drops zero balances, so an account without free TAO has no record:
  // read it fresh, falling back to the pool record while the query loads
  const { data: freshTransferableTao, isError: isErrorTransferableTao } =
    useGetBittensorTransferableBalance({ networkId, address })
  const knownTransferableTao = freshTransferableTao ?? balanceTokenOut?.transferable.planck ?? null
  const existentialDeposit = useExistentialDeposit(tokenIdOut)

  // conviction locks constrain the coldkey's TOTAL alpha on the subnet:
  // this position's sellable amount is min(position stake, subnet-wide available)
  const allBalances = useBalances("owned")
  const subnetUnstakeInfo = useMemo(
    () => (address ? getDTaoSubnetUnstakeInfo(allBalances, address, networkId, netuid) : null),
    [allBalances, address, networkId, netuid]
  )

  // The cached lock (balances poll every ~6s) can lag a lock that GROWS on-chain (owner auto-lock
  // every block, or a concurrent top-up). Read it fresh so the sellable guard tightens before
  // signing, avoiding a StakeUnavailable revert.
  const { data: freshLockedMass } = useGetBittensorColdkeyLock({
    networkId,
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

  const { data: sapi } = useScaleApi(networkId)

  const {
    payload,
    feeEstimatePayload,
    txMetadata,
    amountOut: valueOut,
    priceImpact,
    isLoading,
    isError,
    slippage,
    minTaoBond,
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
    networkId,
    remarkType: "swap",
  })

  const {
    isMevShieldDisabled,
    isMevShieldFeatureDisabled,
    withMevShield,
    setIsMevProtectionEnabled,
    txMode,
    onSubmit,
    confirm,
  } = useSwapSubmit({
    netuid,
    account,
    direction: "sell",
    resetValueIn,
    valueIn: state.valueIn,
    symbol: tokenSymbolForAnalytics(tokenIn),
    taoPlancks: typeof valueOut === "bigint" ? valueOut : null,
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

  const sweepableRemainder = useMemo(
    () =>
      balanceTokenIn && typeof minAlphaBond === "bigint"
        ? getSweepableRemainder({
            stake: balanceTokenIn.free.planck,
            amount: state.valueIn ?? 0n,
            maxAmount: maxValueIn,
            minKeep: minAlphaBond,
            minAmount: minAlphaUnstake ?? 0n,
          })
        : null,
    [balanceTokenIn, minAlphaBond, state.valueIn, maxValueIn, minAlphaUnstake]
  )

  const inputError = useMemo<InlineError | null>(() => {
    if (!tokenIn || typeof state.valueIn !== "bigint" || !balanceTokenIn) return null

    if (state.valueIn > maxValueIn) {
      // the conviction locked stake cannot be unstaked (chain would throw StakeUnavailable)
      if (effectiveLocked > 0n && state.valueIn <= balanceTokenIn.free.planck)
        return {
          message: t("Exceeds unlocked stake: {{amount}} {{symbol}} is locked", {
            amount: new BalanceFormatter(effectiveLocked, tokenIn.decimals).tokens,
            symbol: tokenIn.symbol,
          }),
          category: "input_invalid",
        }
      return { message: t("Insufficient balance"), category: "insufficient_balance" }
    }

    if (knownTransferableTao === null && isErrorTransferableTao)
      return { message: t("Failed to load TAO balance"), category: "rpc" }

    // the chain only pays fees from staked alpha for direct calls, never inside the batch_all
    // the wallet sends, so the fee always comes from free TAO
    if (
      typeof combinedFeeEstimate === "bigint" &&
      typeof knownTransferableTao === "bigint" &&
      existentialDeposit &&
      existentialDeposit.planck + combinedFeeEstimate > knownTransferableTao
    )
      return { message: t("Insufficient TAO to cover fee"), category: "insufficient_fee" }

    if (typeof minAlphaUnstake === "bigint" && state.valueIn < minAlphaUnstake)
      return {
        message: t("Minimum unbond is {{amount}} {{symbol}}", {
          amount: new BalanceFormatter(minAlphaUnstake, tokenIn.decimals).tokens,
          symbol: tokenIn.symbol,
        }),
        category: "input_invalid",
      }

    if (sweepableRemainder) {
      const minTao = new BalanceFormatter(minTaoBond ?? 0n, tokenOut?.decimals).tokens
      return {
        message:
          sweepableRemainder.maxPartial === null
            ? t(
                "Bittensor closes stakes worth less than {{minTao}} {{taoSymbol}}. Unstake everything.",
                {
                  minTao,
                  taoSymbol: tokenOut?.symbol,
                }
              )
            : t(
                "Bittensor closes stakes worth less than {{minTao}} {{taoSymbol}}. Unstake everything, or at most {{amount}} {{symbol}}.",
                {
                  minTao,
                  taoSymbol: tokenOut?.symbol,
                  amount: formatDecimals(
                    new BalanceFormatter(sweepableRemainder.maxPartial, tokenIn.decimals).tokens
                  ),
                  symbol: tokenIn.symbol,
                }
              ),
        category: "input_invalid",
      }
    }

    return null
  }, [
    balanceTokenIn,
    knownTransferableTao,
    isErrorTransferableTao,
    existentialDeposit,
    combinedFeeEstimate,
    maxValueIn,
    effectiveLocked,
    sweepableRemainder,
    minTaoBond,
    minAlphaUnstake,
    state.valueIn,
    t,
    tokenIn,
    tokenOut?.decimals,
    tokenOut?.symbol,
  ])

  const inputErrorMessage = inputError?.message ?? null
  useErrorShown({
    shown: inputErrorMessage,
    surface: "field",
    category: inputError?.category ?? "input_invalid",
    field: "amount",
  })

  const isValid = typeof state.valueIn === "bigint" && state.valueIn > 0n && !inputErrorMessage

  const canSubmit = !!payload && isValid && typeof knownTransferableTao === "bigint"

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
    maxPartialValueIn: sweepableRemainder?.maxPartial ?? null,
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
    confirm,

    onValueChange,
  }
}

export const [SwapSellProvider, useSwapSell] = provideContext(useSwapSellProvider)
