import { EthBaseFeeTrend, EthBasePriorityOptionsEip1559 } from "@core/domains/signing/types"
import * as Sentry from "@sentry/browser"
import { BigNumber, ethers } from "ethers"
import { parseUnits } from "ethers/lib/utils"

const BLOCKS_HISTORY_LENGTH = 4
const REWARD_PERCENTILES = [10, 20, 30]

export const DEFAULT_ETH_PRIORITY_OPTIONS: EthBasePriorityOptionsEip1559 = {
  low: parseUnits("1.5", "gwei"),
  medium: parseUnits("1.6", "gwei"),
  high: parseUnits("1.7", "gwei"),
}

type FeeHistory = {
  oldestBlock: number
  baseFeePerGas: BigNumber[]
  gasUsedRatio: (number | null)[]
  reward?: BigNumber[][] // TODO find network that doesn't return this property, for testing
}

export type FeeHistoryAnalysis = {
  maxPriorityPerGasOptions: EthBasePriorityOptionsEip1559
  avgGasUsedRatio: number | null
  isValid: boolean
  avgBaseFeePerGas: BigNumber
  isBaseFeeIdle: boolean
  nextBaseFee: BigNumber
  baseFeeTrend: EthBaseFeeTrend
}

export const getFeeHistoryAnalysis = async (
  provider: ethers.providers.JsonRpcProvider
): Promise<FeeHistoryAnalysis> => {
  try {
    const rawHistoryFee = await provider.send("eth_feeHistory", [
      ethers.utils.hexValue(BLOCKS_HISTORY_LENGTH),
      "latest",
      REWARD_PERCENTILES,
    ])

    // parse hex values
    const feeHistory: FeeHistory = {
      oldestBlock: parseInt(rawHistoryFee.oldestBlock, 16),
      baseFeePerGas: rawHistoryFee.baseFeePerGas.map((fee: string) => BigNumber.from(fee)), // can be an array of null (ex astar)
      gasUsedRatio: rawHistoryFee.gasUsedRatio as (number | null)[],
      reward: rawHistoryFee.reward.map((reward: string[]) => reward.map((r) => BigNumber.from(r))),
    }

    // how busy the network is over this period
    // values can be null (ex astar)
    const avgGasUsedRatio = feeHistory.gasUsedRatio.includes(null)
      ? null
      : (feeHistory.gasUsedRatio as number[]).reduce((prev, curr) => prev + curr, 0) /
        feeHistory.gasUsedRatio.length

    // lookup the max priority fee per gas based on our percentiles options
    // use a median to exclude extremes, to limits edge cases in low network activity conditions
    const medMaxPriorityFeePerGas: BigNumber[] = []
    if (feeHistory.reward) {
      const percentilesCount = REWARD_PERCENTILES.length
      for (let i = 0; i < percentilesCount; i++) {
        const values = feeHistory.reward.map((arr) => BigNumber.from(arr[i]))
        const sorted = values.sort((a, b) => (a.eq(b) ? 0 : a.gt(b) ? 1 : -1))
        const median = sorted[Math.floor((sorted.length - 1) / 2)]
        medMaxPriorityFeePerGas.push(median)
      }
    } else
      medMaxPriorityFeePerGas.push(
        DEFAULT_ETH_PRIORITY_OPTIONS.low,
        DEFAULT_ETH_PRIORITY_OPTIONS.medium,
        DEFAULT_ETH_PRIORITY_OPTIONS.high
      )

    // last entry of the array is the base fee for next block
    const nextBaseFee = feeHistory.baseFeePerGas.pop() as BigNumber

    const isBaseFeeIdle = feeHistory.baseFeePerGas.every((fee) => fee.eq(nextBaseFee))

    const avgBaseFeePerGas = feeHistory.baseFeePerGas
      .reduce((prev, curr) => prev.add(curr), BigNumber.from(0))
      .div(feeHistory.baseFeePerGas.length)

    const baseFeeTrend = isBaseFeeIdle
      ? "idle"
      : nextBaseFee.lt(avgBaseFeePerGas)
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
