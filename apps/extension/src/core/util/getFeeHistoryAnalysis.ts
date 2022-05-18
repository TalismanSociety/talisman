import { BigNumber, ethers } from "ethers"
import { formatUnits, parseUnits } from "ethers/lib/utils"
import * as Sentry from "@sentry/browser"
import { EthPriorityOptionName, EthPriorityOptions } from "@core/types"

const BLOCKS_HISTORY_LENGTH = 4
const REWARD_PERCENTILES = [10, 30, 60]

const FALLBACK_OPTIONS: EthPriorityOptions = {
  low: parseUnits("1", "gwei"),
  medium: parseUnits("10", "gwei"),
  high: parseUnits("50", "gwei"),
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
  baseFeePerGas: BigNumber
  options: EthPriorityOptions
  recommended: EthPriorityOptionName
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
    const avgMaxPriorityPerGas: BigNumber[] = []
    if (feeHistory.reward) {
      const percentilesCount = feeHistory.reward?.[0]?.length
      for (let i = 0; i < percentilesCount; i++) {
        let sum = BigNumber.from(0)
        for (let j = 0; j < feeHistory.reward.length; j++)
          sum = sum.add(BigNumber.from(feeHistory.reward[j][i]))
        const avg = sum.div(BigNumber.from(feeHistory.reward.length))
        avgMaxPriorityPerGas.push(avg)
      }
    } else
      avgMaxPriorityPerGas.push(
        FALLBACK_OPTIONS.low,
        FALLBACK_OPTIONS.medium,
        FALLBACK_OPTIONS.high
      )

    // select recommended option based on recent network usage
    let recommended: EthPriorityOptionName = "low"
    if (avgGasUsedRatio > 0.9) recommended = "high"
    else if (avgGasUsedRatio > 0.5) recommended = "medium"

    return {
      baseFeePerGas: feeHistory.baseFeePerGas[0],
      options: {
        low: avgMaxPriorityPerGas[0],
        medium: avgMaxPriorityPerGas[1],
        high: avgMaxPriorityPerGas[2],
      },
      recommended,
      gasUsedRatio: avgGasUsedRatio,
    }
  } catch (err) {
    Sentry.captureException(err)
    //some networks don't support eth_feeHistory, fallback to default options
    return {
      baseFeePerGas: FALLBACK_OPTIONS.low,
      options: FALLBACK_OPTIONS,
      recommended: "low",
      gasUsedRatio: -1, // unknown
    }
  }
}
