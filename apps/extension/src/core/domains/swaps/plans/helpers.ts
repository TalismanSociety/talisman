import {
  BITTENSOR_EVM_PAIRS,
  BITTENSOR_EXISTENTIAL_DEPOSIT_RAO,
  BITTENSOR_WEI_PER_RAO,
} from "@core/domains/bittensor/constants"
import { type NetworkId, networkIdFromTokenId } from "@talismn/chaindata-provider"
import BigNumber from "bignumber.js"

import type { QuoteLeg } from "../types"
import type { PersistedQuoteLeg, SwapPlan } from "./types"

export const fromPersistedLeg = (leg: PersistedQuoteLeg): QuoteLeg => ({
  ...leg,
  inputAmount: BigInt(leg.inputAmount),
  outputAmount: BigInt(leg.outputAmount),
  fees: leg.fees.map((fee) => ({ ...fee, amount: BigNumber(fee.amount) })),
})

/** Bittensor EVM reaps an account that drops under the existential deposit */
const keepAliveWei = (networkId: NetworkId) =>
  BITTENSOR_EVM_PAIRS.some((pair) => pair.evmNetworkId === networkId)
    ? BITTENSOR_EXISTENTIAL_DEPOSIT_RAO * BITTENSOR_WEI_PER_RAO
    : 0n

/**
 * What leg `index` spends: the least of what the previous leg landed, what the signer can spend
 * and what was quoted. Funds already on the intermediate are never swept into the plan.
 */
export const deriveLegInput = (plan: SwapPlan, index: number, balance: bigint): bigint => {
  const leg = plan.legs[index]
  const previous = plan.legs[index - 1]
  const landed = previous?.state.at === "landed" ? BigInt(previous.state.amount) : 0n
  const spendable = balance - keepAliveWei(networkIdFromTokenId(leg.quote.fromTokenId))
  return [landed, BigInt(leg.quote.inputAmount), spendable].reduce((min, value) =>
    value < min ? value : min
  )
}
