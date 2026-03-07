import { log } from "@common/extension-shared"
import { fromHex, toHex } from "@polkadot-api/utils"
import { TAO_DECIMALS } from "@talismn/balances"
import { blake2b256 } from "@talismn/crypto"
import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import {
  findSubtensorStakeCall,
  getOperationType,
  type StakingOperationType,
  type SubtensorStakeCallType,
} from "./stakingCallHelpers"

export type { StakingOperationType, SubtensorStakeCallType } from "./stakingCallHelpers"

/** The matched SubtensorModule call with normalized structure */
export type MatchedCall = {
  pallet: string
  method: SubtensorStakeCallType
  args: Record<string, unknown>
}

export type StakingOperationResult = {
  /** The type of staking operation that was performed */
  operationType: StakingOperationType
  /** The SubtensorModule call method name */
  callType?: SubtensorStakeCallType
  /** Direction of the swap */
  direction: "taoToAlpha" | "alphaToTao"
  /** The expected price (TAO per Alpha) based on simulation at previous block, scaled by 10^9. Only available for stake/unstake operations. */
  expectedPrice?: bigint
  /** The effective price (TAO per Alpha) based on actual swap, scaled by 10^9. Only available for stake/unstake operations. */
  effectivePrice?: bigint
  /** The matched SubtensorModule call from the extrinsic, for display purposes */
  matchedCall?: MatchedCall
}

class HistoricalDataUnavailableError extends Error {
  constructor() {
    super("Historical data unavailable")
    this.name = "HistoricalDataUnavailableError"
  }
}

type StakeEventInfo = {
  taoAmount: bigint
  alphaAmount: bigint
  fee: bigint
}

/**
 * Find a StakeAdded or StakeRemoved event in the block that matches our criteria.
 * Events contain the ground truth TAO and Alpha amounts from the actual swap.
 *
 * We filter events by the extrinsic index (via the event's `phase` field) to avoid
 * matching events from other extrinsics in the same block that happen to share the
 * same (netuid, hotkey) parameters.
 *
 * Event structure from bittensor:
 * - StakeAdded(coldkey, hotkey, TaoCurrency, AlphaCurrency, NetUid, fee)
 * - StakeRemoved(coldkey, hotkey, TaoCurrency, AlphaCurrency, NetUid, fee)
 */
const findStakeEventInBlock = async (
  sapi: ScaleApi,
  blockHash: `0x${string}`,
  netuid: number,
  hotkey: string,
  direction: "buy" | "sell",
  extrinsicIndex: number
): Promise<(StakeEventInfo & { coldkey: string }) | null> => {
  try {
    // Query events at the specific block
    const eventsHex = await api.subSend<string>(BITTENSOR_NETWORK_ID, "state_getStorage", [
      // System.Events storage key
      "0x26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7",
      blockHash,
    ])

    if (!eventsHex) return null

    // Decode the events using sapi
    const chain = sapi.chain
    const eventsCodec = chain.builder.buildStorage("System", "Events")
    const events = eventsCodec.value.dec(eventsHex) as Array<{
      phase: { type?: string; value?: number } | undefined
      event: { type: string; value: { type: string; value: unknown } }
      topics: unknown[]
    }>

    // Look for the matching StakeAdded or StakeRemoved event
    const eventName = direction === "buy" ? "StakeAdded" : "StakeRemoved"

    for (const { phase, event } of events) {
      if (phase?.type !== "ApplyExtrinsic" || phase?.value !== extrinsicIndex) continue

      // PAPI/sapi decoded structure uses type/value pattern
      if (event.type === "SubtensorModule" && event.value?.type === eventName) {
        // Event value is a tuple: [coldkey, hotkey, tao, alpha, netuid, fee]
        const value = event.value.value as [string, string, bigint, bigint, number, bigint]
        const [coldkey, eventHotkey, taoAmount, alphaAmount, eventNetuid, fee] = value

        // Match by netuid and hotkey
        if (eventNetuid === netuid && eventHotkey === hotkey) {
          return { coldkey, taoAmount, alphaAmount, fee }
        }
      }
    }

    return null
  } catch (error) {
    // Check if this is an error due to pruned/unavailable state
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = (error as { code?: number })?.code
    if (
      errorCode === 4003 ||
      errorMessage.includes("State already discarded") ||
      errorMessage.includes("pruned") ||
      errorMessage.includes("missing trie node") ||
      errorMessage.includes("block not found") ||
      errorMessage.includes("UnknownBlock")
    ) {
      throw new HistoricalDataUnavailableError()
    }
    // For other errors, return null and let the caller handle it
    return null
  }
}

type UseStakingOperationParams = {
  /** Transaction hash */
  hash: string
  /** Block height where the transaction was included */
  blockHeight: number
  /** Netuid of the subnet being staked to/from */
  netuid: number
  /** Hotkey being staked to/from */
  hotkey: string
  /** Direction of the trade */
  direction: "buy" | "sell"
}

/**
 * Hook to compute staking operation details for an included transaction.
 *
 * Slippage is computed by comparing:
 * 1. Expected price: Simulated swap at the previous block (what user expected)
 * 2. Effective price: Derived from StakeAdded/StakeRemoved event in the transaction block (what actually happened)
 *
 * @param params - Transaction details including netuid, hotkey, and valueIn to identify the correct staking call
 */
export const useBittensorStakingOperation = (params: UseStakingOperationParams | null) => {
  const { data: sapi } = useScaleApi(BITTENSOR_NETWORK_ID)

  return useQuery({
    queryKey: [
      "useBittensorStakingOperation",
      sapi?.id,
      params?.hash,
      params?.blockHeight,
      params?.netuid,
      params?.hotkey,
      params?.direction,
    ],
    queryFn: async (): Promise<StakingOperationResult | null> => {
      if (!sapi || !params) return null

      // We need the block height to query historical data
      const { hash, blockHeight, netuid, hotkey, direction } = params
      if (!blockHeight || !hash) return null

      // Step 1: Get the block hash for this block and the previous block
      const blockHash = await api.subSend<`0x${string}`>(
        BITTENSOR_NETWORK_ID,
        "chain_getBlockHash",
        [blockHeight]
      )
      if (!blockHash) return null

      const previousBlockHash = await api.subSend<`0x${string}`>(
        BITTENSOR_NETWORK_ID,
        "chain_getBlockHash",
        [blockHeight - 1]
      )

      // Track the operation type, call type, and matched call from the decoded call
      let operationType: StakingOperationType = "unknown"
      let callType: SubtensorStakeCallType | undefined
      let matchedCall: MatchedCall | undefined

      // Step 1: Fetch the block and find our extrinsic by hash to get its index
      const block = await api.subSend<{ block: { extrinsics: string[] } }>(
        BITTENSOR_NETWORK_ID,
        "chain_getBlock",
        [blockHash]
      )
      if (!block?.block?.extrinsics) return null

      let extrinsicIndex = -1
      let extrinsicHex: string | null = null
      for (let i = 0; i < block.block.extrinsics.length; i++) {
        const extHex = block.block.extrinsics[i]
        const extBytes = fromHex(extHex as `0x${string}`)
        const extHash = toHex(blake2b256(extBytes))
        if (extHash === hash) {
          extrinsicIndex = i
          extrinsicHex = extHex
          break
        }
      }
      if (extrinsicIndex === -1 || !extrinsicHex) return null

      // Step 2: Get block events filtered to our extrinsic index to find the
      // StakeAdded/StakeRemoved event with actual amounts.
      // Filtering by extrinsic index avoids matching events from other transactions
      // in the same block that share the same (netuid, hotkey).
      const stakeEvent = await findStakeEventInBlock(
        sapi,
        blockHash,
        netuid,
        hotkey,
        direction,
        extrinsicIndex
      )
      if (!stakeEvent) return null

      const { coldkey } = stakeEvent

      // Step 3: Decode the extrinsic call to find the specific SubtensorModule staking call
      const decodedCall = sapi.getDecodedCallFromExtrinsic(extrinsicHex as `0x${string}`)
      log.debug("[Slippage Debug] Found extrinsic:", { hash, decodedCall })

      // Find the actual SubtensorModule staking call (handles wrapped calls)
      // Pass coldkey to correctly identify the call in batches with many proxy calls
      if (decodedCall) {
        const stakeCall = findSubtensorStakeCall(decodedCall, netuid, hotkey, coldkey, direction)
        if (stakeCall) {
          const args = stakeCall.args as Record<string, unknown>
          operationType = getOperationType(stakeCall)
          callType = stakeCall.method
          matchedCall = {
            pallet: stakeCall.pallet,
            method: stakeCall.method,
            args,
          }
          log.debug("[Slippage Debug] Found SubtensorModule staking call:", {
            pallet: stakeCall.pallet,
            method: stakeCall.method,
            operationType,
            args,
          })
        } else {
          log.debug(
            "[Slippage Debug] No matching SubtensorModule staking call found in extrinsic",
            { params, decodedCall, coldkey }
          )
        }
      }

      // Calculate effective price from actual swap (available for all operations with events)
      // Price = TAO / Alpha (how much TAO per 1 Alpha), scaled by 10^9
      const unit = 10n ** BigInt(TAO_DECIMALS)
      if (stakeEvent.alphaAmount === 0n) return null
      const effectivePrice = (stakeEvent.taoAmount * unit) / stakeEvent.alphaAmount

      // For operations where we cannot meaningfully simulate the expected output,
      // return with just effectivePrice (no expectedPrice or slippage).
      // - change_validator: stake moves between hotkeys on same subnet, no swap occurs
      // - change_subnet: involves two swaps (exit origin, enter destination), simulation not meaningful
      // - transfer: ownership transfer, no swap occurs
      // - unstake_all: we don't have the exact alpha amount to simulate
      // - unknown: we couldn't identify the call, can't simulate
      const simulatableOperations: StakingOperationType[] = [
        "stake",
        "stake_limit",
        "unstake",
        "unstake_limit",
      ]
      if (!simulatableOperations.includes(operationType)) {
        return {
          operationType,
          callType,
          direction: direction === "buy" ? "taoToAlpha" : "alphaToTao",
          effectivePrice,
          matchedCall,
        }
      }

      // Step 3: Simulate the swap at the previous block to get the expected output
      // Use the actual input from the event, not the passed valueIn (which may differ)
      const actualInput = direction === "buy" ? stakeEvent.taoAmount : stakeEvent.alphaAmount
      const simulation = await simulateSwapAtBlock(
        sapi,
        netuid,
        direction === "buy" ? "taoToAlpha" : "alphaToTao",
        actualInput,
        previousBlockHash
      )
      if (!simulation) return null

      // Step 4: Calculate expected price from simulation
      // For buy: TAO input / Alpha output
      // For sell: TAO output / Alpha input
      const expectedPrice =
        direction === "buy"
          ? simulation.alpha_amount === 0n
            ? null
            : (actualInput * unit) / simulation.alpha_amount
          : actualInput === 0n
            ? null
            : (simulation.tao_amount * unit) / actualInput

      if (expectedPrice === null) return null

      return {
        operationType,
        callType,
        direction: direction === "buy" ? "taoToAlpha" : "alphaToTao",
        expectedPrice,
        effectivePrice,
        matchedCall,
      }
    },
    enabled: !!sapi && !!params,
    staleTime: Number.POSITIVE_INFINITY, // Slippage for past transactions never changes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
    // Don't retry if historical data is unavailable - it won't become available
    retry: (failureCount, error) => {
      if (error instanceof HistoricalDataUnavailableError) return false
      return failureCount < 3
    },
  })
}

type SwapSimulation = {
  tao_amount: bigint
  alpha_amount: bigint
  tao_fee: bigint
  alpha_fee: bigint
}

/**
 * Simulate a swap at a specific block using runtime API.
 * This gives us the expected output for a given input amount based on the pool state at that block.
 */
const simulateSwapAtBlock = async (
  sapi: ScaleApi,
  netuid: number,
  direction: "taoToAlpha" | "alphaToTao",
  amount: bigint,
  blockHash: `0x${string}` | null
): Promise<SwapSimulation | null> => {
  if (!blockHash) return null

  const method = direction === "taoToAlpha" ? "sim_swap_tao_for_alpha" : "sim_swap_alpha_for_tao"

  // Use the chain's send method directly to query at a specific block
  const chain = sapi.chain
  const call = chain.builder.buildRuntimeCall("SwapRuntimeApi", method)

  // Encode the args and convert to hex string for the RPC call
  const argsHex = toHex(call.args.enc([netuid, amount]))

  try {
    const hex = await api.subSend<string>(BITTENSOR_NETWORK_ID, "state_call", [
      `SwapRuntimeApi_${method}`,
      argsHex,
      blockHash,
    ])

    if (!hex) return null

    return call.value.dec(hex) as SwapSimulation
  } catch (error) {
    // Check if this is an error due to pruned/unavailable state (non-archive node)
    // Error code 4003 is returned when the block state has been discarded
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = (error as { code?: number })?.code
    if (
      errorCode === 4003 ||
      errorMessage.includes("State already discarded") ||
      errorMessage.includes("pruned") ||
      errorMessage.includes("missing trie node") ||
      errorMessage.includes("block not found") ||
      errorMessage.includes("UnknownBlock")
    ) {
      throw new HistoricalDataUnavailableError()
    }
    throw error
  }
}
