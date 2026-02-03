import { fromHex, toHex } from "@polkadot-api/utils"
import { TAO_DECIMALS } from "@talismn/balances"
import { blake2b256 } from "@talismn/crypto"
import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { log } from "extension-shared"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"

type SlippageResult = {
  /** The expected price (TAO per Alpha) based on simulation at previous block, scaled by 10^9 */
  expectedPrice: bigint
  /** The effective price (TAO per Alpha) based on actual swap, scaled by 10^9 */
  effectivePrice: bigint
  /** Slippage as a percentage (positive = got less than expected, negative = got more than expected) */
  slippagePercent: number
  /** Direction of the swap */
  direction: "taoToAlpha" | "alphaToTao"
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
 * Event structure from bittensor:
 * - StakeAdded(coldkey, hotkey, TaoCurrency, AlphaCurrency, NetUid, fee)
 * - StakeRemoved(coldkey, hotkey, TaoCurrency, AlphaCurrency, NetUid, fee)
 */
const findStakeEventInBlock = async (
  sapi: ScaleApi,
  blockHash: `0x${string}`,
  netuid: number,
  hotkey: string,
  direction: "buy" | "sell"
): Promise<StakeEventInfo | null> => {
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
      phase: unknown
      event: { type: string; value: { type: string; value: unknown } }
      topics: unknown[]
    }>

    // Look for the matching StakeAdded or StakeRemoved event
    const eventName = direction === "buy" ? "StakeAdded" : "StakeRemoved"

    for (const { event } of events) {
      // PAPI/sapi decoded structure uses type/value pattern
      if (event.type === "SubtensorModule" && event.value?.type === eventName) {
        // Event value is a tuple: [coldkey, hotkey, tao, alpha, netuid, fee]
        const value = event.value.value as [string, string, bigint, bigint, number, bigint]
        const [_coldkey, eventHotkey, taoAmount, alphaAmount, eventNetuid, fee] = value

        // Match by netuid and hotkey
        if (eventNetuid === netuid && eventHotkey === hotkey) {
          return { taoAmount, alphaAmount, fee }
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

type UseSlippageParams = {
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
 * Hook to compute slippage for an included transaction.
 *
 * Slippage is computed by comparing:
 * 1. Expected price: Simulated swap at the previous block (what user expected)
 * 2. Effective price: Derived from StakeAdded/StakeRemoved event in the transaction block (what actually happened)
 *
 * @param params - Transaction details including netuid, hotkey, and valueIn to identify the correct staking call
 */
export const useBittensorStakingSlippage = (params: UseSlippageParams | null) => {
  const { data: sapi } = useScaleApi(BITTENSOR_NETWORK_ID)

  return useQuery({
    queryKey: [
      "useBittensorStakingSlippage",
      sapi?.id,
      params?.hash,
      params?.blockHeight,
      params?.netuid,
      params?.hotkey,
      params?.direction,
    ],
    queryFn: async (): Promise<SlippageResult | null> => {
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

      // Debug: Fetch and decode the extrinsic
      const block = await api.subSend<{ block: { extrinsics: string[] } }>(
        BITTENSOR_NETWORK_ID,
        "chain_getBlock",
        [blockHash]
      )
      if (block?.block?.extrinsics) {
        for (const extHex of block.block.extrinsics) {
          // Compute extrinsic hash using blake2b256
          const extBytes = fromHex(extHex as `0x${string}`)
          const extHash = toHex(blake2b256(extBytes))
          if (extHash === hash) {
            // Decode and log the call
            const decodedCall = decodeCallFromExtrinsic(sapi, extHex as `0x${string}`)
            // eslint-disable-next-line no-console
            log.log("[Slippage Debug] Found extrinsic:", { hash, decodedCall })
            break
          }
        }
      }

      // Step 2: Get block events to find the StakeAdded/StakeRemoved event with actual amounts
      const stakeEvent = await findStakeEventInBlock(sapi, blockHash, netuid, hotkey, direction)
      if (!stakeEvent) return null

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

      // Step 4: Calculate prices
      // Price = TAO / Alpha (how much TAO per 1 Alpha), scaled by 10^9
      const unit = 10n ** BigInt(TAO_DECIMALS)

      // Expected price from simulation
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

      // Effective price from actual swap
      if (stakeEvent.alphaAmount === 0n) return null
      const effectivePrice = (stakeEvent.taoAmount * unit) / stakeEvent.alphaAmount

      // Step 5: Calculate slippage based on output amounts
      // For buy (taoToAlpha): compare alpha output
      // For sell (alphaToTao): compare tao output
      const expectedOutput = direction === "buy" ? simulation.alpha_amount : simulation.tao_amount
      const actualOutput = direction === "buy" ? stakeEvent.alphaAmount : stakeEvent.taoAmount

      if (expectedOutput === 0n) return null

      // Slippage = (expected - actual) / expected * 100
      // Positive = got less than expected (bad), Negative = got more than expected (good)
      const slippagePercent = (Number(expectedOutput - actualOutput) / Number(expectedOutput)) * 100

      // Debug logging
      // eslint-disable-next-line no-console
      // console.log("[Slippage Debug]", {
      //   direction,
      //   blockHeight,
      //   actualInput: actualInput.toString(),
      //   simulation: {
      //     tao_amount: simulation.tao_amount.toString(),
      //     alpha_amount: simulation.alpha_amount.toString(),
      //   },
      //   event: {
      //     taoAmount: stakeEvent.taoAmount.toString(),
      //     alphaAmount: stakeEvent.alphaAmount.toString(),
      //   },
      //   expectedOutput: expectedOutput.toString(),
      //   actualOutput: actualOutput.toString(),
      //   slippagePercent,
      // })

      return {
        expectedPrice,
        effectivePrice,
        slippagePercent,
        direction: direction === "buy" ? "taoToAlpha" : "alphaToTao",
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

/**
 * Decode the call data from a signed extrinsic.
 * Extrinsic v4 structure (after compact length):
 * - 1 byte: version (0x84 for signed v4)
 * - address: MultiAddress (1 byte variant + 32 bytes for AccountId32)
 * - signature: MultiSignature (1 byte variant + 64 bytes for Sr25519/Ed25519)
 * - extra: signed extensions (variable length, decoded based on metadata)
 * - call: remaining bytes
 */
const decodeCallFromExtrinsic = (
  sapi: ScaleApi,
  extrinsicHex: `0x${string}`
): { pallet: string; method: string; args: unknown } | null => {
  try {
    const bytes = fromHex(extrinsicHex)

    // Decode compact length prefix - skip past it to get to the extrinsic body
    let offset = 0
    const firstByte = bytes[offset]
    if ((firstByte & 0b11) === 0b00) {
      // Single byte mode
      offset += 1
    } else if ((firstByte & 0b11) === 0b01) {
      // Two byte mode
      offset += 2
    } else if ((firstByte & 0b11) === 0b10) {
      // Four byte mode
      offset += 4
    } else {
      // Big integer mode - length is in the upper 6 bits + following bytes
      const numBytes = (firstByte >> 2) + 4
      offset += 1 + numBytes
    }

    // Check version byte - 0x84 means signed v4 (0x80 signed flag + 0x04 version)
    const versionByte = bytes[offset]
    offset += 1

    const isSigned = (versionByte & 0x80) !== 0
    const version = versionByte & 0x7f

    if (version !== 4) {
      return null
    }

    if (!isSigned) {
      // Unsigned extrinsic - call data starts immediately after version
      const callData = bytes.slice(offset)
      const callDef = sapi.chain.builder.buildDefinition(sapi.chain.lookup.call!)
      const decoded = callDef.dec(callData)
      return {
        pallet: decoded.type,
        method: decoded.value.type,
        args: decoded.value.value,
      }
    }

    // Signed extrinsic - need to skip address, signature, and extra

    // Address: MultiAddress enum (variant 0 = Id with 32 byte AccountId)
    const addressVariant = bytes[offset]
    offset += 1
    if (addressVariant === 0) {
      // AccountId32 - 32 bytes
      offset += 32
    } else if (addressVariant === 1) {
      // Index - compact encoded
      const idxFirstByte = bytes[offset]
      if ((idxFirstByte & 0b11) === 0b00) offset += 1
      else if ((idxFirstByte & 0b11) === 0b01) offset += 2
      else if ((idxFirstByte & 0b11) === 0b10) offset += 4
      else offset += 1 + (idxFirstByte >> 2) // big integer
    } else {
      // Other address types not commonly used
      // eslint-disable-next-line no-console
      log.warn("[Slippage Debug] Unsupported address variant:", addressVariant)
      return null
    }

    // Signature: MultiSignature enum
    const sigVariant = bytes[offset]
    offset += 1
    if (sigVariant === 0 || sigVariant === 1) {
      // Ed25519 or Sr25519 - 64 bytes
      offset += 64
    } else if (sigVariant === 2) {
      // Ecdsa - 65 bytes
      offset += 65
    } else {
      // eslint-disable-next-line no-console
      log.warn("[Slippage Debug] Unsupported signature variant:", sigVariant)
      return null
    }

    // Extra (signed extensions) - we need to skip these based on metadata
    // For Bittensor, the signed extensions are typically:
    // - CheckMortality (Era): 1 or 2 bytes
    // - CheckNonce: compact
    // - ChargeTransactionPayment (tip): compact
    // - CheckMetadataHash: 1 byte (mode) + optionally 32 bytes (hash)

    // Era (mortality)
    const eraFirstByte = bytes[offset]
    if (eraFirstByte === 0) {
      // Immortal
      offset += 1
    } else {
      // Mortal - 2 bytes
      offset += 2
    }

    // Nonce (compact)
    const nonceFirstByte = bytes[offset]
    if ((nonceFirstByte & 0b11) === 0b00) offset += 1
    else if ((nonceFirstByte & 0b11) === 0b01) offset += 2
    else if ((nonceFirstByte & 0b11) === 0b10) offset += 4
    else offset += 1 + (nonceFirstByte >> 2)

    // Tip (compact)
    const tipFirstByte = bytes[offset]
    if ((tipFirstByte & 0b11) === 0b00) offset += 1
    else if ((tipFirstByte & 0b11) === 0b01) offset += 2
    else if ((tipFirstByte & 0b11) === 0b10) offset += 4
    else offset += 1 + (tipFirstByte >> 2)

    // CheckMetadataHash: 1 byte mode (0 = disabled, 1 = enabled with hash)
    // Only present if the chain supports it - check if we're still within bounds
    if (offset < bytes.length) {
      const metadataMode = bytes[offset]
      offset += 1
      if (metadataMode === 1) {
        // Skip the 32-byte metadata hash
        offset += 32
      }
    }

    // Remaining bytes are the call data
    const callData = bytes.slice(offset)

    // Decode the call
    const callDef = sapi.chain.builder.buildDefinition(sapi.chain.lookup.call!)
    const decoded = callDef.dec(callData)

    return {
      pallet: decoded.type,
      method: decoded.value.type,
      args: decoded.value.value,
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    log.error("[Slippage Debug] Failed to decode extrinsic:", err)
    return null
  }
}
