import { Binary, Enum } from "@polkadot-api/substrate-bindings"
import { TAO_DECIMALS } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"

import type { StakeDirection } from "../hooks/types"
import type { RemarkType } from "./constants"
import {
  DTAO_STAKING_REMARKS,
  ROOT_NETUID,
  TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR,
} from "./constants"

export type BittensorSwapSimulation = {
  tao_amount: bigint
  alpha_amount: bigint
  tao_fee: bigint
  alpha_fee: bigint
}

export const getSwapSimulation = async (
  sapi: ScaleApi,
  netuid: number,
  direction: StakeDirection,
  amount: bigint
) => {
  const method = direction === "taoToAlpha" ? "sim_swap_tao_for_alpha" : "sim_swap_alpha_for_tao"

  // this will simulate the swap over the different layers of liquidity available in the pool, output is deterministic
  return sapi.getRuntimeCallValue<BittensorSwapSimulation>("SwapRuntimeApi", method, [
    netuid,
    amount,
  ])
}

export const getLimitPrice = (
  simulation: BittensorSwapSimulation,
  direction: StakeDirection,
  tolerance: number = 0 // 0.0005 = 0.05%
) => {
  // prevent division by zero
  if (!simulation.alpha_amount) return 0n

  const toleranceScaleFactor = 10_000n // dont expect more than 4 decimal places in tolerance
  const scaledTolerance = BigInt(Math.round(tolerance * Number(toleranceScaleFactor)))

  // price based on the simulation result
  const unit = 10n ** BigInt(TAO_DECIMALS)
  const price = (simulation.tao_amount * unit) / simulation.alpha_amount

  // limit price with tolerance
  const limitPrice =
    direction === "taoToAlpha"
      ? (price * (toleranceScaleFactor + scaledTolerance)) / toleranceScaleFactor
      : (price * (toleranceScaleFactor - scaledTolerance)) / toleranceScaleFactor

  return limitPrice
}

export const getBittensorStakingPayload = async ({
  sapi,
  address,
  hotkey,
  amount,
  priceLimit,
  netuid,
  talismanFee,
  remarkType,
}: {
  sapi: ScaleApi
  address: string
  hotkey: string
  amount: bigint
  priceLimit: bigint
  netuid: number
  talismanFee: bigint
  remarkType: RemarkType
}) => {
  if (netuid === 0) {
    return sapi.getExtrinsicPayload(
      "Utility",
      "batch_all",
      {
        calls: [
          sapi.getDecodedCall("SubtensorModule", "add_stake", {
            hotkey,
            netuid: ROOT_NETUID,
            amount_staked: amount,
          }),
          sapi.getDecodedCall("System", "remark_with_event", {
            remark: Binary.fromText(DTAO_STAKING_REMARKS[remarkType]),
          }),
        ],
      },
      { address }
    )
  }
  // transfer_keep_alive must come before add_stake_limit:
  // when using max, the budget is tight (transferable - ED - fee = amountIn).
  // If add_stake_limit runs first it drains most of the balance, leaving
  // transfer_keep_alive with only the fee‐estimate margin — any slight fee
  // variance causes Token::Frozen. Sending the fee while balance is still
  // high avoids this, and add_stake_limit's BestEffort withdrawal adapts to
  // whatever remains.
  return sapi.getExtrinsicPayload(
    "Utility",
    "batch_all",
    {
      calls: [
        sapi.getDecodedCall("Balances", "transfer_keep_alive", {
          dest: Enum("Id", TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR),
          value: talismanFee,
        }),
        sapi.getDecodedCall("SubtensorModule", "add_stake_limit", {
          hotkey,
          netuid,
          amount_staked: amount,
          limit_price: priceLimit,
          allow_partial: false,
        }),
        sapi.getDecodedCall("System", "remark_with_event", {
          remark: Binary.fromText(DTAO_STAKING_REMARKS[remarkType]),
        }),
      ],
    },
    { address }
  )
}

type GetBittensorUnbondPayload = {
  sapi: ScaleApi
  address: string
  hotkey: string
  amount: bigint
  talismanFee: bigint
  priceLimit: bigint
  netuid: number
  remarkType: RemarkType
  withClaim?: boolean
}

type GetBittensorMoveStakePayload = {
  sapi: ScaleApi
  address: string
  originHotkey: string
  destinationHotkey: string
  originNetuid: number
  destinationNetuid: number
  alphaAmount: bigint
}

export const getBittensorUnbondPayload = ({
  sapi,
  address,
  hotkey,
  amount,
  netuid,
  priceLimit,
  talismanFee,
  remarkType,
  withClaim,
}: GetBittensorUnbondPayload) => {
  if (netuid === ROOT_NETUID) {
    return sapi.getExtrinsicPayload(
      "Utility",
      "batch_all",
      {
        calls: [
          sapi.getDecodedCall("SubtensorModule", "remove_stake", {
            hotkey: hotkey,
            netuid: ROOT_NETUID,
            amount_unstaked: amount,
          }),
          // the claim MUST come after remove_stake: it re-stakes the claimed TAO onto
          // root and restarts the RootStakeUnlockInterval hold for this pair, which
          // would make a subsequent remove_stake revert with RootStakeLocked
          ...(withClaim
            ? [sapi.getDecodedCall("SubtensorModule", "claim_root_with_hotkey", { hotkey })]
            : []),
          sapi.getDecodedCall("System", "remark_with_event", {
            remark: Binary.fromText(DTAO_STAKING_REMARKS[remarkType]),
          }),
        ],
      },
      { address }
    )
  }
  // remove_stake_limit DEPOSITS TAO back into the user's account, so
  // transfer_keep_alive runs with a higher balance — the opposite of
  // the buy flow where the order must be reversed.
  return sapi.getExtrinsicPayload(
    "Utility",
    "batch_all",
    {
      calls: [
        sapi.getDecodedCall("SubtensorModule", "remove_stake_limit", {
          hotkey,
          netuid,
          amount_unstaked: amount,
          limit_price: priceLimit,
          allow_partial: false,
        }),
        sapi.getDecodedCall("Balances", "transfer_keep_alive", {
          dest: Enum("Id", TALISMAN_FEE_RECEIVER_ADDRESS_BITTENSOR),
          value: talismanFee,
        }),
        sapi.getDecodedCall("System", "remark_with_event", {
          remark: Binary.fromText(DTAO_STAKING_REMARKS[remarkType]),
        }),
      ],
    },
    { address }
  )
}

/**
 * Creates a payload for moving stake between validators (hotkeys) and/or subnets.
 * This uses the SubtensorModule.move_stake extrinsic.
 *
 * Use cases:
 * - **Change validator within same subnet**: Pass the same netuid for both `originNetuid` and
 *   `destinationNetuid`. This moves your staked alpha from one validator to another without
 *   leaving the subnet.
 *
 * - **Move stake between subnets**: Pass different netuids for `originNetuid` and `destinationNetuid`
 *   to move stake from one subnet to another (possibly to a different validator as well).
 *
 * @param sapi - The Scale API instance
 * @param address - The account address performing the move
 * @param originHotkey - The hotkey (validator) currently holding the stake
 * @param destinationHotkey - The hotkey (validator) to move the stake to
 * @param originNetuid - The subnet ID where the stake currently resides
 * @param destinationNetuid - The subnet ID to move the stake to (same as origin for validator change)
 * @param alphaAmount - The amount of alpha tokens to move (in planck)
 */
export const getBittensorMoveStakePayload = ({
  sapi,
  address,
  originHotkey,
  destinationHotkey,
  originNetuid,
  destinationNetuid,
  alphaAmount,
}: GetBittensorMoveStakePayload) => {
  return sapi.getExtrinsicPayload(
    "Utility",
    "batch_all",
    {
      calls: [
        sapi.getDecodedCall("SubtensorModule", "move_stake", {
          origin_hotkey: originHotkey,
          destination_hotkey: destinationHotkey,
          origin_netuid: originNetuid,
          destination_netuid: destinationNetuid,
          alpha_amount: alphaAmount,
        }),
        sapi.getDecodedCall("System", "remark_with_event", {
          remark: Binary.fromText(DTAO_STAKING_REMARKS.stake),
        }),
      ],
    },
    { address }
  )
}

const FALLBACK_BLOCK_TIME_MS = 12_000

/**
 * Bittensor runs Aura, which publishes no block-time constant: the convention is
 * 2 × `Timestamp.MinimumPeriod` (12s on mainnet/testnet, 250ms on a fast localnet).
 */
export const getBlockTimeMs = (sapi: ScaleApi): number => {
  try {
    const minimumPeriod = sapi.getConstant<bigint>("Timestamp", "MinimumPeriod")
    return minimumPeriod ? Number(minimumPeriod) * 2 : FALLBACK_BLOCK_TIME_MS
  } catch {
    return FALLBACK_BLOCK_TIME_MS
  }
}
