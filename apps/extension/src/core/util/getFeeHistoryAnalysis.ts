import { EthPriorityOptions } from "@core/domains/signing/types"
import * as Sentry from "@sentry/browser"
import { BigNumber, ethers } from "ethers"
import { formatUnits, parseUnits } from "ethers/lib/utils"

const BLOCKS_HISTORY_LENGTH = 4
const REWARD_PERCENTILES = [10, 20, 30]

export const DEFAULT_ETH_PRIORITY_OPTIONS: EthPriorityOptions = {
  low: parseUnits("1", "gwei"),
  medium: parseUnits("1.5", "gwei"),
  high: parseUnits("2", "gwei"),
}

type FeeHistory = {
  oldestBlock: number
  baseFeePerGas: BigNumber[]
  gasUsedRatio: number[]
  reward?: BigNumber[][]
}

const logFeeHistory = (feeHistory: FeeHistory) => {
  let avgMaxPriorityFeePerGas: string[] | undefined = undefined
  if (feeHistory.reward?.[0]?.length) {
    const valuesCount = feeHistory.reward?.[0]?.length
    const avgs = []
    for (let i = 0; i < valuesCount; i++) {
      let sum = BigNumber.from(0)
      for (let j = 0; j < feeHistory.reward.length; j++)
        sum = sum.add(BigNumber.from(feeHistory.reward[j][i]))
      const avg = sum.div(BigNumber.from(feeHistory.reward.length))
      avgs.push(`${formatUnits(avg, "gwei")} GWEI`)
    }

    avgMaxPriorityFeePerGas = avgs
  }

  // eslint-disable-next-line no-console
  console.debug("FeeHistory", {
    gasUsed: feeHistory.gasUsedRatio.map((gu) => `${Math.round(gu * 100)}%`),
    baseFeePerGas: feeHistory.baseFeePerGas.map((bf) => `${formatUnits(bf, "gwei")} GWEI`),
    rewards: feeHistory.reward?.map((rs) => rs.map((r) => `${formatUnits(r, "gwei")} GWEI`)),
    avgMaxPriorityFeePerGas,
  })
}

export type FeeHistoryAnalysis = {
  options: EthPriorityOptions
  gasUsedRatio: number
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
      baseFeePerGas: rawHistoryFee.baseFeePerGas.map((fee: string) => BigNumber.from(fee)),
      gasUsedRatio: rawHistoryFee.gasUsedRatio as number[],
      reward: rawHistoryFee.reward.map((reward: string[]) => reward.map((r) => BigNumber.from(r))),
    }
    logFeeHistory(feeHistory)

    // how busy the network is
    const avgGasUsedRatio =
      feeHistory.gasUsedRatio.reduce((prev, curr) => prev + curr, 0) /
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

    return {
      options: {
        low: medMaxPriorityFeePerGas[0],
        medium: medMaxPriorityFeePerGas[1],
        high: medMaxPriorityFeePerGas[2],
      },
      gasUsedRatio: avgGasUsedRatio,
    }
  } catch (err) {
    Sentry.captureException(err)
    //some networks don't support eth_feeHistory, fallback to default options
    return {
      options: DEFAULT_ETH_PRIORITY_OPTIONS,
      gasUsedRatio: -1,
    }
  }
}
