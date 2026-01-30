import { toHex } from "@polkadot-api/utils"
import { TAO_DECIMALS } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"

/** Staking methods we recognize (with and without limit price) */
const STAKING_METHODS = {
  // No limit price
  add_stake: { direction: "taoToAlpha", hasLimit: false },
  remove_stake: { direction: "alphaToTao", hasLimit: false },
  // With limit price
  add_stake_limit: { direction: "taoToAlpha", hasLimit: true },
  remove_stake_limit: { direction: "alphaToTao", hasLimit: true },
} as const

type StakingMethod = keyof typeof STAKING_METHODS

type StakingCallInfo = {
  method: StakingMethod
  direction: "taoToAlpha" | "alphaToTao"
  netuid: number
  hotkey: string
  amount: bigint
  limitPrice: bigint | null
}

type DecodedCall = {
  pallet: string
  method: string
  // biome-ignore lint/suspicious/noExplicitAny: decoded args structure varies
  args: any
}

type StakingCallFilter = {
  netuid: number
  hotkey: string
  valueIn: bigint
}

/**
 * Recursively scans a decoded call (including proxied/batched calls) to find a staking operation.
 * When filter is provided, matches against netuid, hotkey, and amount to identify the correct call in a batch.
 * Returns all matching staking calls found.
 */
const findStakingCalls = (
  decodedCall: DecodedCall,
  results: StakingCallInfo[] = []
): StakingCallInfo[] => {
  const { pallet, method, args } = decodedCall

  // Check if this is a SubtensorModule staking call
  if (pallet === "SubtensorModule" && method in STAKING_METHODS) {
    const config = STAKING_METHODS[method as StakingMethod]
    results.push({
      method: method as StakingMethod,
      direction: config.direction,
      netuid: args.netuid as number,
      hotkey: args.hotkey as string,
      amount:
        config.direction === "taoToAlpha"
          ? BigInt(args.amount_staked ?? 0)
          : BigInt(args.amount_unstaked ?? 0),
      limitPrice: config.hasLimit ? BigInt(args.limit_price ?? 0) : null,
    })
    return results
  }

  // Check for proxy call wrapper
  if (pallet === "Proxy" && method === "proxy" && args.call) {
    return findStakingCalls(args.call, results)
  }

  // Check for batch calls (Utility.batch, Utility.batch_all, Utility.force_batch)
  if (pallet === "Utility" && ["batch", "batch_all", "force_batch"].includes(method)) {
    const calls = args.calls as DecodedCall[] | undefined
    if (calls) {
      for (const innerCall of calls) {
        findStakingCalls(innerCall, results)
      }
    }
  }

  return results
}

/**
 * Finds the staking call that matches the given filter criteria.
 * Matches by netuid, hotkey, and amount (using valueIn for buy, valueOut for sell).
 */
const findMatchingStakingCall = (
  calls: StakingCallInfo[],
  filter: StakingCallFilter
): StakingCallInfo | null => {
  // Find a call that matches netuid, hotkey, and amount
  return (
    calls.find(
      (call) =>
        call.netuid === filter.netuid &&
        call.hotkey === filter.hotkey &&
        call.amount === filter.valueIn
    ) ?? null
  )
}

type SlippageResult = {
  /** The expected price (from limit or from alpha price at previous block), in TAO per Alpha (scaled by 10^decimals) */
  expectedPrice: bigint
  /** The effective price based on actual swap output, in TAO per Alpha (scaled by 10^decimals) */
  effectivePrice: bigint
  /** Slippage as a percentage (positive = worse than expected, negative = better than expected) */
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

type UseSlippageParams = {
  /** Transaction hash */
  hash: string
  /** Block height where the transaction was included */
  blockHeight: number
  /** Netuid of the subnet being staked to/from */
  netuid: number
  /** Hotkey being staked to/from */
  hotkey: string
  /** Value input (TAO for buy, Alpha for sell) */
  valueIn: bigint
  /** Value output (Alpha for buy, TAO for sell) */
  valueOut: bigint
  /** Direction of the trade */
  direction: "buy" | "sell"
}

/**
 * Hook to compute slippage for an indexed transaction.
 *
 * For a transaction to have slippage computed:
 * 1. It must be an indexed transaction (has blockHeight)
 * 2. The decoded call must contain a staking/unstaking operation
 * 3. We need either a limit_price from the call, or we fetch the alpha price from the previous block
 * 4. We compare the expected price with the effective price (based on actual in/out values)
 *
 * @param params - Transaction details including netuid, hotkey, and valueIn to identify the correct staking call in a batch
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
      params?.valueIn?.toString(),
    ],
    queryFn: async (): Promise<SlippageResult | null> => {
      if (!sapi || !params) return null

      // We need the block height to query historical data
      const { hash, blockHeight, netuid, hotkey, valueIn, valueOut, direction } = params
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

      // Step 2: Get the block data to find and decode the extrinsic
      const blockData = await api.subSend<{
        block: {
          extrinsics: `0x${string}`[]
        }
      }>(BITTENSOR_NETWORK_ID, "chain_getBlock", [blockHash])

      if (!blockData?.block?.extrinsics) return null

      // Find the extrinsic with matching hash and decode it to find the correct staking call
      let stakingInfo: StakingCallInfo | null = null
      const filter: StakingCallFilter = { netuid, hotkey, valueIn }

      for (const extrinsicHex of blockData.block.extrinsics) {
        // Decode the extrinsic using sapi's builder
        try {
          const decoded = sapi.getDecodedCallFromPayload({ method: extrinsicHex })
          const allCalls = findStakingCalls(decoded)

          if (allCalls.length > 0) {
            // If there's only one call, use it
            // Otherwise, find the one that matches our filter criteria
            stakingInfo =
              allCalls.length === 1 ? allCalls[0] : findMatchingStakingCall(allCalls, filter)

            if (stakingInfo) break
          }
        } catch {
          // Not all extrinsics can be decoded the same way, continue
        }
      }

      // If we couldn't find the staking call from decoded extrinsics, try to infer from transaction data
      if (!stakingInfo) {
        // We can still compute slippage based on the transaction's in/out values
        // but we won't have access to the limit price
        stakingInfo = {
          method: direction === "buy" ? "add_stake_limit" : "remove_stake_limit",
          direction: direction === "buy" ? "taoToAlpha" : "alphaToTao",
          netuid,
          hotkey,
          amount: valueIn,
          limitPrice: null,
        }
      }

      // Step 3: Determine expected price
      let expectedPrice: bigint

      if (stakingInfo.limitPrice !== null && stakingInfo.limitPrice > 0n) {
        // Use the limit price from the call
        expectedPrice = stakingInfo.limitPrice
      } else {
        // Fetch alpha price at the previous block
        // Query the alpha price at the previous block
        const alphaPriceAtPrevBlock = await queryAlphaPriceAtBlock(sapi, netuid, previousBlockHash)
        if (!alphaPriceAtPrevBlock) return null

        expectedPrice = alphaPriceAtPrevBlock
      }

      // Step 4: Calculate effective price based on actual in/out values
      // Price = TAO / Alpha (how much TAO per 1 Alpha)
      const unit = 10n ** BigInt(TAO_DECIMALS)

      const taoAmount = direction === "buy" ? valueIn : valueOut
      const alphaAmount = direction === "buy" ? valueOut : valueIn

      if (alphaAmount === 0n) return null

      const effectivePrice = (taoAmount * unit) / alphaAmount

      // Step 5: Calculate slippage percentage
      // Slippage = (effectivePrice - expectedPrice) / expectedPrice * 100
      // For buys: positive slippage = paid more TAO per Alpha than expected (bad)
      // For sells: positive slippage = received less TAO per Alpha than expected (bad)
      const slippagePercent = (Number(effectivePrice - expectedPrice) / Number(expectedPrice)) * 100

      // Adjust sign based on direction
      // For buys: higher effective price = worse (positive slippage)
      // For sells: lower effective price = worse (positive slippage)
      const adjustedSlippage = direction === "buy" ? slippagePercent : -slippagePercent

      return {
        expectedPrice,
        effectivePrice,
        slippagePercent: adjustedSlippage,
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

/**
 * Query the alpha price at a specific block using runtime API
 */
const queryAlphaPriceAtBlock = async (
  sapi: ScaleApi,
  netuid: number,
  blockHash: `0x${string}` | null
): Promise<bigint | null> => {
  if (!blockHash) return null

  // Use the chain's send method directly to query at a specific block
  const chain = sapi.chain
  const call = chain.builder.buildRuntimeCall("SwapRuntimeApi", "current_alpha_price")

  // Encode the args and convert to hex string for the RPC call
  const argsHex = toHex(call.args.enc([netuid]))

  try {
    const hex = await api.subSend<string>(BITTENSOR_NETWORK_ID, "state_call", [
      `SwapRuntimeApi_current_alpha_price`,
      argsHex,
      blockHash,
    ])

    if (!hex) return null

    return call.value.dec(hex) as bigint
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
