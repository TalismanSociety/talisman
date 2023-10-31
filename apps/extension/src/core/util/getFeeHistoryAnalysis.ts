import { EthBaseFeeTrend } from "@core/domains/signing/types"
import * as Sentry from "@sentry/browser"
import { PublicClient, parseGwei } from "viem"

const BLOCKS_HISTORY_LENGTH = 4
const REWARD_PERCENTILES = [10, 20, 30]

type EthBasePriorityOptionsEip1559 = Record<"low" | "medium" | "high", bigint>

export const DEFAULT_ETH_PRIORITY_OPTIONS: EthBasePriorityOptionsEip1559 = {
  low: parseGwei("1.5"),
  medium: parseGwei("1.6"),
  high: parseGwei("1.7"),
}

// type FeeHistory = {
//   oldestBlock: bigint
//   baseFeePerGas: bigint[]
//   gasUsedRatio: (number)[] // can have null values (ex astar)
//   reward?: BigNumber[][] // TODO find network that doesn't return this property, for testing
// }

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
    // const rawHistoryFee = await provider.send("eth_feeHistory", [
    //   ethers.utils.hexValue(BLOCKS_HISTORY_LENGTH),
    //   "latest",
    //   REWARD_PERCENTILES,
    // ])
    const feeHistory = await publicClient.getFeeHistory({
      blockTag: "latest",
      blockCount: BLOCKS_HISTORY_LENGTH,
      rewardPercentiles: REWARD_PERCENTILES,
    })

    // instrument for information - remove asap
    // if (!feeHistory.reward)
    //   Sentry.captureMessage(`No reward on fee history`, {
    //     extra: { chain: publicClient.chain?.id },
    //   })

    // parse hex values
    // const feeHistory: FeeHistory = {
    //   oldestBlock: parseInt(rawHistoryFee.oldestBlock, 16),
    //   baseFeePerGas: rawHistoryFee.baseFeePerGas.map((fee: string) => BigNumber.from(fee)),
    //   gasUsedRatio: rawHistoryFee.gasUsedRatio as (number | null)[],
    //   reward: rawHistoryFee.reward
    //     ? rawHistoryFee.reward.map((reward: string[]) => reward.map((r) => BigNumber.from(r)))
    //     : null,
    // }

    // how busy the network is over this period
    // values can be null (ex astar)
    // TODO check that with viem values can't be null
    // const avgGasUsedRatio = feeHistory.gasUsedRatio.includes(null)
    //   ? null
    //   : (feeHistory.gasUsedRatio as number[]).reduce((prev, curr) => prev + curr, 0) /
    //   feeHistory.gasUsedRatio.length
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

    return {
      maxPriorityPerGasOptions: {
        low: medMaxPriorityFeePerGas[0],
        medium: medMaxPriorityFeePerGas[1],
        high: medMaxPriorityFeePerGas[2],
      },
      avgGasUsedRatio: avgGasUsedRatio,
      isValid: !feeHistory.gasUsedRatio.includes(0), // if a 0 is found, not all blocks contained a transaction
      avgBaseFeePerGas,
      isBaseFeeIdle,
      nextBaseFee,
      baseFeeTrend,
    }
  } catch (err) {
    Sentry.captureException(err)
    throw new Error("Failed to load fee history", { cause: err as Error })
  }
}
