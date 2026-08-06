import { taoToAlphaCeil } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useMemo } from "react"

import { useGetBittensorMinJoinBond } from "../../hooks/bittensor/useGetBittensorMinJoinBond"
import { useGetBittensorDefaultMinStake } from "../../hooks/bittensor/useGetBittensorMinStake"
import { useGetSeekDiscount } from "../../Seek/hooks/useGetSeekDiscount"
import type { RemarkType } from "../utils/constants"
import {
  calculateEffectiveFeeRate,
  calculateFee,
  calculateMinimumStakeInput,
} from "../utils/feeCalculations"
import {
  getBittensorStakingPayload,
  getBittensorUnbondPayload,
  getLimitPrice,
  getSwapSimulation,
} from "../utils/helpers"
import type { StakeDirection } from "./types"
import { useBittensorAlphaPrice } from "./useBittensorAlphaPrice"
import { useBittensorSimulateSwap } from "./useBittensorSimulateSwap"
import { useBittensorSubnetSlippage } from "./useBittensorSubnetSlippage"
import { useGetSubnetFee } from "./useGetSubnetFee"

type UseBittensorStakingPayloadProps = {
  address: string | null
  hotkey: string | null | undefined
  networkId: string | undefined
  netuid: number | null
  amountIn: bigint | null
  direction: StakeDirection
  remarkType: RemarkType
  /** batch a claim_root_with_hotkey into the unstake (root unbond only) */
  withClaim?: boolean
  /** whole position exits and the hold window is off: claim-first + remove_stake_full_limit */
  fullExit?: boolean
}

const MOCKED_HOTKEY = "5HK5tp6t2S59DywmHRWPBVJeJ86T61KjurYqeooqj8sREpeN"

export const useBittensorStakingPayload = ({
  networkId,
  address,
  hotkey,
  netuid,
  direction,
  amountIn,
  remarkType,
  withClaim = false,
  fullExit = false,
}: UseBittensorStakingPayloadProps) => {
  const { tier } = useGetSeekDiscount()
  const subnetFee = useGetSubnetFee({ netuid: netuid ?? 0, direction })
  const [slippage] = useBittensorSubnetSlippage(netuid)

  const { data: sapi, isLoading: isLoadingSapi, isError: isErrorSapi } = useScaleApi(networkId)

  const {
    data: minTaoBond,
    isLoading: isLoadingMinTaoBond,
    isError: isErrorMinTaoBond,
  } = useGetBittensorMinJoinBond({ networkId })

  const {
    data: alphaPrice,
    isLoading: isLoadingAlphaPrice,
    isError: isErrorAlphaPrice,
  } = useBittensorAlphaPrice({ networkId, netuid })

  // an partial unstake operation will fail if the remaining stake is less than the alpha equivalent of minTaoBond
  const minAlphaBond = useMemo(() => {
    if (typeof minTaoBond !== "bigint" || typeof alphaPrice !== "bigint") return null
    return taoToAlphaCeil(minTaoBond, alphaPrice)
  }, [minTaoBond, alphaPrice])

  const minTaoStake = useGetBittensorDefaultMinStake({ networkId })

  const minAlphaUnstake = useMemo(() => {
    if (typeof minTaoStake !== "bigint" || typeof alphaPrice !== "bigint") return null
    return taoToAlphaCeil(minTaoStake, alphaPrice)
  }, [minTaoStake, alphaPrice])

  // simulate swap for minimum stake to get swap fee
  const { data: minStakeSwapSimulation } = useQuery({
    queryKey: ["minStakeSwapSimulation", sapi?.id, netuid, minTaoStake?.toString()],
    queryFn: async () => {
      if (!sapi || typeof netuid !== "number" || netuid === 0 || typeof minTaoStake !== "bigint")
        return null
      return getSwapSimulation(sapi, netuid, "taoToAlpha", minTaoStake)
    },
  })

  const effectiveFeeRate = useMemo(
    () => calculateEffectiveFeeRate(netuid, subnetFee, tier.discount),
    [netuid, subnetFee, tier.discount]
  )

  // minimum input that accounts for swap fee and talisman fee
  const minTaoStakeForInput = useMemo(() => {
    if (typeof minTaoStake !== "bigint") return null
    if (netuid === 0 || netuid === null) return minTaoStake
    if (!minStakeSwapSimulation) return null

    return calculateMinimumStakeInput(minTaoStake, minStakeSwapSimulation.tao_fee, effectiveFeeRate)
  }, [minTaoStake, netuid, minStakeSwapSimulation, effectiveFeeRate])

  const minTaoBondForInput = useMemo(() => {
    if (typeof minTaoBond !== "bigint") return null
    if (netuid === 0 || netuid === null) return minTaoBond
    if (!minStakeSwapSimulation) return null

    return calculateMinimumStakeInput(minTaoBond, minStakeSwapSimulation.tao_fee, effectiveFeeRate)
  }, [minTaoBond, netuid, minStakeSwapSimulation, effectiveFeeRate])

  // amount to be swapped. in case of taoToAlpha on a subnet, we need to subtract the talisman fee first or it will invalidate the simulation.
  const amount = useMemo(() => {
    if (typeof netuid !== "number" || typeof amountIn !== "bigint") return null
    if (netuid === 0) return amountIn

    switch (direction) {
      case "taoToAlpha": {
        const talismanFee = calculateFee({
          amount: amountIn,
          feePercent: subnetFee,
          seekDiscount: tier.discount,
        })
        return amountIn - talismanFee
      }
      case "alphaToTao":
        return amountIn
    }
  }, [amountIn, direction, netuid, subnetFee, tier.discount])

  const {
    data: simulation,
    isLoading: isLoadingSimulation,
    isError: isErrorSimulation,
  } = useBittensorSimulateSwap({
    networkId,
    direction,
    netuid,
    amountIn: amount,
  })

  // price that we will pay if no slippage occurs
  const swapPrice = useMemo(() => {
    if (!simulation) return null
    return getLimitPrice(simulation, direction, 0)
  }, [simulation, direction])

  const priceLimit = useMemo(() => {
    if (!simulation) return null
    const tolerance = slippage / 100 // percentage to decimal
    return getLimitPrice(simulation, direction, tolerance)
  }, [simulation, direction, slippage])

  const priceImpact = useMemo(() => {
    if (!alphaPrice || !swapPrice) return null
    const scaleFactor = 10_000n // to get 4 decimal places
    const diff = swapPrice - alphaPrice // bigint
    const scaledPriceImpact = (diff * scaleFactor) / alphaPrice
    return Number(scaledPriceImpact) / 100
  }, [alphaPrice, swapPrice])

  const talismanFee = useMemo(() => {
    if (typeof amountIn !== "bigint" || !simulation) return null
    // WARNING: because of slippage it would make more sense to send alpha instead of tao when unstaking
    return calculateFee({
      amount: direction === "taoToAlpha" ? amountIn : simulation?.tao_amount,
      feePercent: subnetFee,
      seekDiscount: tier.discount,
    })
  }, [amountIn, direction, simulation, subnetFee, tier.discount])

  const amountOut = useMemo(() => {
    if (!simulation || typeof talismanFee !== "bigint") return 0n // TODO should be null

    switch (direction) {
      case "taoToAlpha":
        return simulation.alpha_amount
      case "alphaToTao":
        return simulation.tao_amount - talismanFee
    }
  }, [direction, simulation, talismanFee])

  const {
    data: swapPayload,
    isLoading: isLoadingPayload,
    isError: isErrorPayload,
    error: errorPayload,
  } = useBittensorAnyStakingPayload({
    sapi,
    direction,
    address,
    netuid,
    hotkey,
    amount,
    priceLimit,
    talismanFee,
    remarkType,
    withClaim,
    fullExit,
  })

  const {
    data: feeEstimatePayload,
    isLoading: isLoadingFeeEstimatePayload,
    isError: isErrorFeeEstimatePayload,
  } = useBittensorAnyStakingPayload({
    sapi,
    direction,
    address,
    netuid,
    hotkey: hotkey ?? MOCKED_HOTKEY,
    amount: amount ?? minTaoBond,
    // Use fallbacks >= 16384 to match real values' 4-byte SCALE compact encoding - less would provide a fee estimate that is 2 plancks short
    priceLimit: priceLimit ?? 100_000n,
    talismanFee: talismanFee ?? 100_000n,
    remarkType,
    withClaim,
    fullExit,
  })

  // a keepPreviousData placeholder built with other claim/full-exit flags has a different
  // batch shape than the form displays: never expose it as signable
  const isCurrentShape = (
    result: { forWithClaim: boolean; forFullExit: boolean } | null | undefined
  ) => !result || (result.forWithClaim === withClaim && result.forFullExit === fullExit)

  return {
    isLoading:
      isLoadingSapi ||
      isLoadingSimulation ||
      isLoadingMinTaoBond ||
      isLoadingPayload ||
      isLoadingFeeEstimatePayload ||
      isLoadingAlphaPrice,
    isError:
      isErrorSapi ||
      isErrorSimulation ||
      isErrorMinTaoBond ||
      isErrorPayload ||
      isErrorFeeEstimatePayload ||
      isErrorAlphaPrice,
    errorPayload,
    amountOut,
    talismanFee,
    payload: isCurrentShape(swapPayload) ? swapPayload?.payload : undefined,
    txMetadata: isCurrentShape(swapPayload) ? swapPayload?.txMetadata : undefined,
    alphaPrice,
    swapPrice,

    feeEstimatePayload: isCurrentShape(feeEstimatePayload)
      ? feeEstimatePayload?.payload
      : undefined,

    minTaoBond,
    minTaoBondForInput,
    minAlphaBond,
    minTaoStake,
    minTaoStakeForInput,
    minAlphaUnstake,
    priceImpact,
    slippage,
  }
}

type useBittensorAnyStakingPayloadProps = {
  direction: StakeDirection
  sapi: ScaleApi | undefined | null
  address: string | null
  hotkey: string | null | undefined
  netuid: number | null
  amount: bigint | null | undefined
  priceLimit: bigint | null
  talismanFee: bigint | null
  remarkType: RemarkType
  withClaim: boolean
  fullExit: boolean
}

const useBittensorAnyStakingPayload = ({
  sapi,
  direction,
  address,
  netuid,
  hotkey,
  amount,
  priceLimit,
  talismanFee,
  remarkType,
  withClaim,
  fullExit,
}: useBittensorAnyStakingPayloadProps) => {
  return useQuery({
    queryKey: [
      "useBittensorAnyStakingPayload",
      sapi?.id,
      direction,
      address,
      netuid,
      hotkey,
      amount?.toString(),
      priceLimit?.toString(),
      talismanFee?.toString(),
      remarkType,
      withClaim,
      fullExit,
    ],
    queryFn: async () => {
      if (
        !sapi ||
        !address ||
        !hotkey ||
        typeof amount !== "bigint" ||
        typeof priceLimit !== "bigint" ||
        typeof talismanFee !== "bigint" ||
        typeof netuid !== "number"
      )
        return null

      const result = await (direction === "taoToAlpha"
        ? getBittensorStakingPayload({
            sapi,
            address,
            hotkey,
            amount,
            priceLimit,
            netuid,
            talismanFee,
            remarkType,
          })
        : getBittensorUnbondPayload({
            sapi,
            address,
            hotkey,
            amount,
            priceLimit,
            netuid,
            talismanFee,
            remarkType,
            withClaim,
            fullExit,
          }))

      // tag the payload with the flags it was built from, so consumers can drop a
      // keepPreviousData placeholder whose batch SHAPE no longer matches the form state
      return { ...result, forWithClaim: withClaim, forFullExit: fullExit }
    },
    // this makes useQuery return previous payload while fetching the new payload
    // inputs change often as price changes on chain, causing our price limit to be updated
    // without this, payload would be temporarily undefined, causing Ledger and Polkadot Vault signing UI to be unmounted while user is signing on their device
    placeholderData: keepPreviousData,
  })
}
