// const TAO_DECIMALS = 10n ** 9n
import { SCALE_FACTOR } from "@talismn/balances/src/modules/SubstrateNativeModule/util/subtensor"
import { useMemo } from "react"

import { useGetSubnetMetagraphByNetuid } from "../../hooks/bittensor/dTao/useGetSubnetMetagraphByNetuid"
import { TALISMAN_FEE_BITTENSOR } from "../utils/constants"

type GetDynamicTaoStakeInfoProps = {
  netuid: number | null
  amount: bigint | null
  direction: "taoToAlpha" | "alphaToTao"
  userMaxSlippage: number
  minJoinBond: bigint | null | undefined
}

export const useGetDynamicTaoStakeInfo = ({
  netuid,
  direction,
  amount,
  userMaxSlippage,
  minJoinBond,
}: GetDynamicTaoStakeInfoProps) => {
  const { data, isLoading, isError } = useGetSubnetMetagraphByNetuid({ netuid })

  const isTaoToAlpha = useMemo(() => direction === "taoToAlpha", [direction])

  const { alpha_out, alpha_in, tao_in } = data ?? {}

  const alphaPrice = useMemo(() => calculateAlphaPrice({ alpha_in, tao_in }), [alpha_in, tao_in])

  // used for add_stake_limit limit order price
  const addAlphaPriceWithSlippage = useMemo(
    () => alphaPrice * (1 + userMaxSlippage / 100),
    [alphaPrice, userMaxSlippage],
  )

  const removeAlphaPriceWithSlippage = useMemo(
    () => alphaPrice * (1 - userMaxSlippage / 100),
    [alphaPrice, userMaxSlippage],
  )

  const taoToAlphaSlippage = useMemo(
    () => calculateSlippage({ alpha_out, tao_in, amount }),
    [alpha_out, amount, tao_in],
  )

  const taoToAlphaTalismanFee = useMemo(
    () => calculateFee({ amount, fee: TALISMAN_FEE_BITTENSOR }),
    [amount],
  )

  // calculate the conversion rate of 1 Tao to alpha with zero slippage
  const taoToAlphaConversionRate = useMemo(
    () =>
      calculateExpectedAlpha({
        alphaPrice,
        amount: 1,
        slippage: 0,
      }),
    [alphaPrice],
  )

  // expected amount of Alpha tokens the user will get taking slippage into account
  const expectedAlphaWithSlippage = useMemo(
    () =>
      calculateExpectedAlpha({
        alphaPrice,
        amount: Number(amount ?? 0n),
        slippage: taoToAlphaSlippage,
      }) / Number(SCALE_FACTOR),
    [alphaPrice, amount, taoToAlphaSlippage],
  )

  const taoAmountFromAlpha = useMemo(
    () =>
      calculateTaoFromAlpha({
        alphaPrice,
        amount: Number(amount ?? 0n),
      }),
    [alphaPrice, amount],
  )

  const alphaToTaoTalismanFee = useMemo(
    () =>
      calculateFee({
        amount: BigInt(Math.round(taoAmountFromAlpha)),
        fee: TALISMAN_FEE_BITTENSOR,
      }),
    [taoAmountFromAlpha],
  )

  const alphaToTaoSlippage = useMemo(
    () =>
      calculateSlippage({
        alpha_out,
        tao_in,
        amount: BigInt(Math.round(taoAmountFromAlpha)),
      }),
    [alpha_out, taoAmountFromAlpha, tao_in],
  )

  // expected amount of TAO tokens the user will get taking slippage into account
  const expectedTaoWithSlippage = useMemo(
    () =>
      calculateExpectedTao({
        alphaPrice,
        amount: Number(amount ?? 0n),
        slippage: alphaToTaoSlippage,
      }) / Number(SCALE_FACTOR),
    [alphaPrice, alphaToTaoSlippage, amount],
  )

  const minAlphaUnstake = useMemo(
    () =>
      calculateExpectedAlpha({
        alphaPrice,
        amount: Number(minJoinBond || 0),
        slippage: 0,
      }) / Number(SCALE_FACTOR),
    [alphaPrice, minJoinBond],
  )

  return {
    alphaPriceWithSlippage: isTaoToAlpha ? addAlphaPriceWithSlippage : removeAlphaPriceWithSlippage,
    slippage: isTaoToAlpha ? taoToAlphaSlippage : alphaToTaoSlippage,
    talismanFee: isTaoToAlpha ? taoToAlphaTalismanFee : alphaToTaoTalismanFee,
    taoToAlphaSlippage,
    taoToAlphaTalismanFee,
    isLoading,
    isError,
    taoToAlphaConversionRate,
    expectedAlphaWithSlippage,
    expectedTaoWithSlippage,
    taoAmountFromAlpha: taoAmountFromAlpha,
    minAlphaUnstake,
  }
}

const calculateSlippage = ({
  alpha_out,
  tao_in,
  amount,
}: {
  alpha_out: bigint | undefined
  tao_in: bigint | undefined
  amount: bigint | null
}): number => {
  if (!alpha_out || !tao_in || !amount) return 0

  // Compute k (constant product of the pool)
  const k = alpha_out * tao_in

  // Expected Alpha if no slippage (simple ratio)
  const alphaExpected = (alpha_out * amount) / tao_in

  // Actual Alpha received from the AMM formula
  const taoPoolUpdated = tao_in + amount
  const alphaActual = alpha_out - k / taoPoolUpdated

  // Slippage calculation with 0.01 precision
  const slippage = ((alphaExpected - alphaActual) * 10000n) / alphaExpected

  return Number(slippage) / 100 // Convert to a number with 0.01 precision
}

const calculateFee = ({ amount, fee }: { amount: bigint | null; fee: number }): bigint => {
  if (!amount) return 0n
  if (fee < 0) {
    throw new Error("Fee percentage cannot be negative")
  }

  return (amount * BigInt(Math.round(fee * 100))) / BigInt(10000)
}

// Alpha price is calculated by taoIn / alphaIn
const calculateAlphaPrice = ({
  alpha_in,
  tao_in,
}: {
  alpha_in: bigint | undefined
  tao_in: bigint | undefined
}): number => {
  if (!tao_in || !alpha_in) return 0
  const result = Number(tao_in) / Number(alpha_in)

  return result
}

const calculateExpectedAlpha = ({
  alphaPrice,
  amount,
  slippage,
}: {
  alphaPrice: number
  amount: number
  slippage: number
}): number => {
  if (!amount || !alphaPrice) return 0

  const expectedAlpha = (amount / alphaPrice) * (1 - slippage / 100)

  return expectedAlpha
}

const calculateExpectedTao = ({
  alphaPrice,
  amount,
  slippage,
}: {
  alphaPrice: number
  amount: number
  slippage: number
}): number => {
  if (!amount || !alphaPrice) return 0
  const expectedTao = amount * alphaPrice * (1 - slippage / 100)

  return expectedTao
}

const calculateTaoFromAlpha = ({
  alphaPrice,
  amount,
}: {
  alphaPrice: number
  amount: number
}): number => {
  if (!amount || !alphaPrice) return 0
  const expectedTao = amount * alphaPrice

  return expectedTao
}
