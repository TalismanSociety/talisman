import { provideContext } from "@talisman/util/provideContext"
import { BalanceFormatter, getBalanceId } from "@talismn/balances"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import type { ScaleApiSubmitMode } from "@talismn/sapi"
import { useBittensorStakingPayload } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPayload"
import { useBittensorStakingPositions } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPositions"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { type BalanceByParamsProps, useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useToken } from "@ui/state"
import { isAccountOfType, type WalletTransactionInfo } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import { useSwapTxWatcher } from "./SwapTxWatcher"

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
  const { addTransaction } = useSwapTxWatcher()

  const [state, setState] = useState<SwapSellInputs>(DEFAULT_INPUTS)
  const [isMevProtectionEnabled, setIsMevProtectionEnabled] = useState(false)

  const positions = useBittensorStakingPositions(BITTENSOR_NETWORK_ID)
  const subnetPositions = useMemo(
    () => positions.filter((position) => position.token.netuid === netuid),
    [positions, netuid]
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

  const tokenIdOut = useMemo(() => subNativeTokenId(BITTENSOR_NETWORK_ID), [])
  const tokenOut = useToken(tokenIdOut, "substrate-native")

  const address = selectedPosition?.balance.address ?? null
  const hotkey = tokenIn?.hotkey ?? null

  const balancesProps = useMemo(
    (): BalanceByParamsProps =>
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

  const maxValueIn = useMemo(() => {
    if (!balanceTokenIn) return 0n
    return balanceTokenIn.transferable.planck ?? balanceTokenIn.free.planck
  }, [balanceTokenIn])

  const onValueChange = useCallback((value: bigint | null) => {
    setState((prev) => ({ ...prev, valueIn: value }))
  }, [])

  const onPositionChange = useCallback((positionId: string) => {
    setState((prev) => ({ ...prev, positionId, valueIn: null }))
  }, [])

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
    minAlphaUnstake,
  } = useBittensorStakingPayload({
    netuid,
    amountIn: state.valueIn,
    direction: "alphaToTao",
    hotkey,
    address,
    networkId: BITTENSOR_NETWORK_ID,
  })

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!tokenIdIn || typeof state.valueIn !== "bigint" || typeof valueOut !== "bigint")
      return undefined

    return {
      type: "bittensor-staking",
      fromTokenId: tokenIdIn,
      toTokenId: tokenIdOut,
      fromAmount: state.valueIn.toString(),
      toAmount: valueOut.toString(),
    }
  }, [tokenIdIn, tokenIdOut, state.valueIn, valueOut])

  const isMevShieldDisabled = useMemo(() => {
    // supported only for hot wallets
    return !netuid || !account || !isAccountOfType(account, "keypair")
  }, [netuid, account])

  const withMevShield = useMemo(
    () => !isMevShieldDisabled && isMevProtectionEnabled,
    [isMevShieldDisabled, isMevProtectionEnabled]
  )

  const txMode: ScaleApiSubmitMode = withMevShield ? "bittensor-mev-shield" : "default"

  const {
    data: feeEstimate,
    isLoading: isLoadingFeeEstimate,
    error: errorFeeEstimate,
  } = useGetFeeEstimate({ sapi, payload: feeEstimatePayload })

  const inputErrorMessage = useMemo(() => {
    if (!tokenIn || typeof state.valueIn !== "bigint" || !balanceTokenIn) return null

    const transferablePlanck =
      balanceTokenIn.transferable.planck ?? balanceTokenIn.free.planck ?? 0n

    if (state.valueIn > transferablePlanck) return t("Insufficient balance")

    if (
      typeof feeEstimate === "bigint" &&
      balanceTokenOut &&
      feeEstimate > balanceTokenOut.transferable.planck
    )
      return t("Insufficient balance to cover fee")

    if (typeof minAlphaUnstake === "bigint" && state.valueIn < minAlphaUnstake)
      return t("Minimum unbond is {{amount}} {{symbol}}", {
        amount: new BalanceFormatter(minAlphaUnstake, tokenIn.decimals).tokens,
        symbol: tokenIn.symbol,
      })

    return null
  }, [balanceTokenIn, balanceTokenOut, feeEstimate, minAlphaUnstake, state.valueIn, t, tokenIn])

  const canSubmit =
    !!payload && !inputErrorMessage && typeof state.valueIn === "bigint" && state.valueIn > 0n

  const onSubmit = useCallback(
    (hash: `0x${string}`, innerHash?: `0x${string}`) => {
      log.debug("Transaction submitted", { hash })

      if (innerHash) {
        addTransaction({
          label: t("MEV Shield"),
          hash,
        })
        addTransaction({
          label: t("Sell SN{{netuid}}", { netuid }),
          hash: innerHash,
        })
      } else {
        addTransaction({
          label: t("Sell SN{{netuid}}", { netuid }),
          hash,
        })
      }
      setState((prev) => ({ ...prev, valueIn: null }))
    },
    [addTransaction, netuid, t]
  )

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

    priceImpact,
    slippage,
    isLoading,
    isError,

    withMevShield,
    isMevShieldDisabled,
    setIsMevProtectionEnabled,

    feeEstimate,
    isLoadingFeeEstimate: isLoading || isLoadingFeeEstimate,
    errorFeeEstimate,

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
