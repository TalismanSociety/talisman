import { taoToAlpha } from "@talismn/balances"
import { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { useGetBittensorMinJoinBond } from "../../hooks/bittensor/useGetBittensorMinJoinBond"
import { useGetBittensorDefaultMinStake } from "../../hooks/bittensor/useGetBittensorMinStake"
import { useGetSeekDiscount } from "../../Seek/hooks/useGetSeekDiscount"
import {
  getBittensorStakingPayload,
  getBittensorUnbondPayload,
  getLimitPrice,
} from "../utils/helpers"
import { StakeDirection } from "./types"
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
}

const MOCKED_HOTKEY = "5HK5tp6t2S59DywmHRWPBVJeJ86T61KjurYqeooqj8sREpeN"

export const useBittensorStakingPayload = ({
  networkId,
  address,
  hotkey,
  netuid,
  direction,
  amountIn,
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
    return taoToAlpha(minTaoBond, alphaPrice)
  }, [minTaoBond, alphaPrice])

  const minTaoStake = useGetBittensorDefaultMinStake({ networkId })

  const minAlphaUnstake = useMemo(() => {
    if (typeof minTaoStake !== "bigint" || typeof alphaPrice !== "bigint") return null
    return taoToAlpha(minTaoStake, alphaPrice)
  }, [minTaoStake, alphaPrice])

  // amount to be swapped. in case of taoToAlpha on a subnet, we need to subtract the talisman fee first or it will invalidate the simulation.
  const amount = useMemo(() => {
    if (typeof netuid !== "number" || typeof amountIn !== "bigint") return null
    if (netuid === 0) return amountIn

    switch (direction) {
      case "taoToAlpha": {
        const talismanFee = calculateFee({
          amount: amountIn,
          fee: subnetFee,
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
    networkId: "bittensor",
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
      fee: subnetFee,
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
    priceLimit: priceLimit ?? 1_000n,
    talismanFee: talismanFee ?? 1_000n,
  })

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
    payload: swapPayload?.payload,
    txMetadata: swapPayload?.txMetadata,
    alphaPrice,
    swapPrice,

    feeEstimatePayload: feeEstimatePayload?.payload,

    minTaoBond,
    minAlphaBond,
    minTaoStake,
    minAlphaUnstake,
    priceImpact,
    slippage,
  }
}

const calculateFee = ({
  amount,
  fee,
  seekDiscount,
}: {
  amount: bigint | null
  fee: number
  seekDiscount: number
}): bigint => {
  if (!amount) return 0n
  if (fee < 0) {
    throw new Error("Fee percentage cannot be negative")
  }

  if (seekDiscount === 0 || !seekDiscount) {
    return (amount * BigInt(Math.round(fee * 100))) / BigInt(10000)
  }

  const discountedFee = fee * (1 - seekDiscount)

  return (amount * BigInt(Math.round(discountedFee * 100))) / BigInt(10000)
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
}: useBittensorAnyStakingPayloadProps) => {
  return useQuery({
    queryKey: [
      "useBittensorAnyStakingPayload",
      sapi,
      direction,
      address,
      netuid,
      hotkey,
      amount?.toString(),
      priceLimit?.toString(),
      talismanFee?.toString(),
    ],
    queryFn: () => {
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

      switch (direction) {
        case "taoToAlpha":
          return getBittensorStakingPayload({
            sapi,
            address,
            hotkey,
            amount,
            priceLimit,
            netuid,
            talismanFee,
          })
        case "alphaToTao":
          return getBittensorUnbondPayload({
            sapi,
            address,
            hotkey,
            amount,
            priceLimit,
            netuid,
            talismanFee,
          })
      }
    },
  })
}
