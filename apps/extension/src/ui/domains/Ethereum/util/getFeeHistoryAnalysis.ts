import { log } from "@extension/shared"
import * as Sentry from "@sentry/browser"
import { PublicClient, formatGwei, parseGwei } from "viem"

import { EthBaseFeeTrend } from "../../../../../../../packages/extension-core/src/domains/signing/types"

const BLOCKS_HISTORY_LENGTH = 5
const REWARD_PERCENTILES = [10, 20, 30]
const LIVE_DEBUG = false

type EthBasePriorityOptionsEip1559 = Record<"low" | "medium" | "high", bigint>

const DEFAULT_ETH_PRIORITY_OPTIONS: EthBasePriorityOptionsEip1559 = {
  low: parseGwei("1.5"),
  medium: parseGwei("1.6"),
  high: parseGwei("1.7"),
}

export type FeeHistoryAnalysis = {
  maxPriorityPerGasOptions: EthBasePriorityOptionsEip1559
  avgGasUsedRatio: number
  isValid: boolean
  avgBaseFeePerGas: bigint
  isBaseFeeIdle: boolean
  nextBaseFee: bigint
  baseFeeTrend: EthBaseFeeTrend
}

export const getFeeHistoryAnalysis = async (
  publicClient: PublicClient
): Promise<FeeHistoryAnalysis> => {
  try {
    const feeHistory = await publicClient.getFeeHistory({
      blockCount: BLOCKS_HISTORY_LENGTH,
      rewardPercentiles: REWARD_PERCENTILES,
    })

    const avgGasUsedRatio =
      (feeHistory.gasUsedRatio as number[]).reduce((prev, curr) => prev + curr, 0) /
      feeHistory.gasUsedRatio.length

    // lookup the max priority fee per gas based on our percentiles options
    // use a median to exclude extremes, to limits edge cases in low network activity conditions
    const medMaxPriorityFeePerGas: bigint[] = []
    if (feeHistory.reward) {
      const percentilesCount = REWARD_PERCENTILES.length
      for (let i = 0; i < percentilesCount; i++) {
        const values = feeHistory.reward.map((arr) => arr[i])
        const sorted = values.sort((a, b) => (a === b ? 0 : a > b ? 1 : -1))
        const median = sorted[Math.floor((sorted.length - 1) / 2)]
        medMaxPriorityFeePerGas.push(median)
      }
    } else
      medMaxPriorityFeePerGas.push(
        DEFAULT_ETH_PRIORITY_OPTIONS.low,
        DEFAULT_ETH_PRIORITY_OPTIONS.medium,
        DEFAULT_ETH_PRIORITY_OPTIONS.high
      )

    // last entry of the array is the base fee for next block, exclude it from further averages
    const nextBaseFee = feeHistory.baseFeePerGas.pop() as bigint

    const isBaseFeeIdle = feeHistory.baseFeePerGas.every((fee) => fee === nextBaseFee)

    const avgBaseFeePerGas =
      feeHistory.baseFeePerGas.reduce((prev, curr) => prev + curr, 0n) /
      BigInt(feeHistory.baseFeePerGas.length)

    const baseFeeTrend = isBaseFeeIdle
      ? "idle"
      : nextBaseFee < avgBaseFeePerGas
      ? "decreasing"
      : !avgGasUsedRatio || avgGasUsedRatio < 0.9
      ? "increasing"
      : "toTheMoon"

    const result: FeeHistoryAnalysis = {
      maxPriorityPerGasOptions: {
        low: medMaxPriorityFeePerGas[0],
        medium: (medMaxPriorityFeePerGas[1] * 102n) / 100n,
        high: (medMaxPriorityFeePerGas[2] * 104n) / 100n,
      },
      avgGasUsedRatio: avgGasUsedRatio,
      isValid: !feeHistory.gasUsedRatio.includes(0), // if a 0 is found, not all blocks contained a transaction
      avgBaseFeePerGas,
      isBaseFeeIdle,
      nextBaseFee,
      baseFeeTrend,
    }

    if (LIVE_DEBUG) {
      log.log(
        "rewards",
        feeHistory.reward?.map((arr) => arr.map((reward) => `${formatGwei(reward)} GWEI`))
      )
      log.log("baseFee", `${formatGwei(result.nextBaseFee)} GWEI`)
      log.log(
        "medMaxPriorityFeePerGas",
        medMaxPriorityFeePerGas.map((fee) => `${formatGwei(fee)} GWEI`)
      )
      log.log(
        "maxPriorityPerGasOptions",
        [
          result.maxPriorityPerGasOptions.low,
          result.maxPriorityPerGasOptions.medium,
          result.maxPriorityPerGasOptions.high,
        ].map((fee) => `${formatGwei(fee)} GWEI`)
      )
      log.log("=========================================")
    }
    return result
  } catch (err) {
    Sentry.captureException(err)
    throw new Error("Failed to load fee history", { cause: err as Error })
  }
}
