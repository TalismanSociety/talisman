import { BalanceFormatter } from "@talismn/balances"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import type { InlineError } from "@ui/hooks/analytics/errorShown"
import { useToken } from "@ui/state/chaindata"
import { useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"

type Props = {
  networkId: string | null | undefined
  taoAmountIn: bigint | null
  taoBalance: bigint | null
  dtaoBalance: bigint | null
  feeEstimate: bigint | null | undefined
  minTaoBondForInput: bigint | null
  minTaoStakeForInput: bigint | null
}

export const useBittensorStakeInputError = ({
  networkId,
  taoAmountIn,
  taoBalance,
  dtaoBalance,
  feeEstimate,
  minTaoBondForInput,
  minTaoStakeForInput,
}: Props) => {
  const { t } = useTranslation()

  const tokenId = useMemo(() => (networkId ? subNativeTokenId(networkId) : null), [networkId])
  const taoToken = useToken(tokenId, "substrate-native")

  // Keep the last known fee so validation stays stable while the fee is re-estimating
  const lastFeeEstimateRef = useRef<bigint | null>(null)
  if (typeof feeEstimate === "bigint") lastFeeEstimateRef.current = feeEstimate
  const effectiveFeeEstimate =
    typeof feeEstimate === "bigint" ? feeEstimate : lastFeeEstimateRef.current

  const inputError = useMemo<InlineError | null>(() => {
    if (!taoToken) return null
    const existentialDeposit = BigInt(taoToken.existentialDeposit)

    // need to keep it verbose for typescript type narrowing
    if (
      typeof taoAmountIn !== "bigint" ||
      typeof taoBalance !== "bigint" ||
      typeof dtaoBalance !== "bigint" ||
      typeof effectiveFeeEstimate !== "bigint" ||
      typeof minTaoBondForInput !== "bigint" ||
      typeof minTaoStakeForInput !== "bigint"
    )
      return null

    if (!taoBalance || taoAmountIn > taoBalance)
      return { message: t("Insufficient balance"), category: "insufficient_balance" }

    if (
      taoBalance &&
      effectiveFeeEstimate &&
      taoAmountIn &&
      taoAmountIn + effectiveFeeEstimate > taoBalance
    )
      return { message: t("Insufficient balance to cover fee"), category: "insufficient_fee" }

    if (existentialDeposit + taoAmountIn + effectiveFeeEstimate > taoBalance)
      return {
        message: t("Insufficient balance to cover fee and keep account alive"),
        category: "insufficient_fee",
      }

    // if not staking yet, need minTaoBondForInput or more
    if (!dtaoBalance && taoAmountIn < minTaoBondForInput)
      return {
        message: t("Minimum bond is {{amount}} {{symbol}}", {
          amount: new BalanceFormatter(minTaoBondForInput, taoToken.decimals).tokens,
          symbol: taoToken.symbol,
        }),
        category: "input_invalid",
      }

    // no staking operation can be less than minTaoStakeForInput
    if (taoAmountIn < minTaoStakeForInput)
      return {
        message: t("Minimum bond is {{amount}} {{symbol}}", {
          amount: new BalanceFormatter(minTaoStakeForInput, taoToken.decimals).tokens,
          symbol: taoToken.symbol,
        }),
        category: "input_invalid",
      }

    return null
  }, [
    dtaoBalance,
    effectiveFeeEstimate,
    minTaoBondForInput,
    minTaoStakeForInput,
    t,
    taoAmountIn,
    taoBalance,
    taoToken,
  ])

  const inputErrorMessage = inputError?.message ?? null

  const isValid = useMemo(() => {
    if (
      typeof taoAmountIn !== "bigint" ||
      typeof taoBalance !== "bigint" ||
      typeof dtaoBalance !== "bigint" ||
      typeof feeEstimate !== "bigint" ||
      typeof minTaoBondForInput !== "bigint" ||
      typeof minTaoStakeForInput !== "bigint"
    )
      return false

    return inputErrorMessage === null
  }, [
    dtaoBalance,
    feeEstimate,
    minTaoBondForInput,
    minTaoStakeForInput,
    taoAmountIn,
    taoBalance,
    inputErrorMessage,
  ])

  return { isValid, inputErrorMessage, inputErrorCategory: inputError?.category }
}
