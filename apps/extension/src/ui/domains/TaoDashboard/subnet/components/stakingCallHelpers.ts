/**
 * Pure helper functions for parsing and matching Bittensor staking calls.
 *
 * These functions have zero runtime dependencies (no api, sapi, React hooks, etc.)
 * so they can be unit-tested in isolation.
 */

/**
 * Operation types for staking transactions.
 * These describe the semantic meaning of the transaction.
 */
export type StakingOperationType =
  | "unknown"
  | "stake"
  | "stake_limit"
  | "unstake"
  | "unstake_limit"
  | "unstake_all"
  | "change_validator"
  | "change_subnet"
  | "transfer"

/**
 * All SubtensorModule staking-related call method names.
 */
export type SubtensorStakeCallType =
  | "add_stake"
  | "remove_stake"
  | "add_stake_limit"
  | "remove_stake_limit"
  | "remove_stake_full_limit"
  | "unstake_all"
  | "unstake_all_alpha"
  | "move_stake"
  | "transfer_stake"
  | "swap_stake"
  | "swap_stake_limit"

export type DecodedCall = {
  pallet: string
  method: string
  args: unknown
}

/**
 * PAPI's native call structure (used in nested calls like batch args)
 */
export type PapiCall = {
  type: string // pallet name
  value: {
    type: string // method name
    value: unknown // args
  }
}

/**
 * Normalize a call to DecodedCall format.
 * Handles both PAPI's native format { type, value: { type, value } }
 * and our DecodedCall format { pallet, method, args }.
 */
export const normalizeCall = (call: DecodedCall | PapiCall | unknown): DecodedCall | null => {
  if (!call || typeof call !== "object") return null

  // Check if it's already in DecodedCall format
  if ("pallet" in call && "method" in call && "args" in call) {
    return call as DecodedCall
  }

  // Check if it's in PAPI format { type, value: { type, value } }
  if ("type" in call && "value" in call) {
    const papiCall = call as PapiCall
    if (
      typeof papiCall.type === "string" &&
      papiCall.value &&
      typeof papiCall.value === "object" &&
      "type" in papiCall.value
    ) {
      return {
        pallet: papiCall.type,
        method: papiCall.value.type,
        args: papiCall.value.value,
      }
    }
  }

  return null
}

/**
 * Matches a decoded SubtensorModule call against our target parameters.
 * Different calls have different argument structures, so we need to check each one.
 *
 * @returns true if this call matches our target netuid/hotkey/direction
 */
export const matchesSubtensorStakeCall = (
  method: string,
  args: Record<string, unknown>,
  targetNetuid: number,
  targetHotkey: string,
  direction: "buy" | "sell"
): boolean => {
  // For "buy" direction, we're looking for calls that add stake (StakeAdded event)
  // For "sell" direction, we're looking for calls that remove stake (StakeRemoved event)

  switch (method) {
    // === Simple add/remove stake ===
    case "add_stake":
    case "add_stake_limit":
      // Only matches "buy" direction
      // Args: { hotkey, netuid, amount_staked, [limit_price, allow_partial] }
      if (direction !== "buy") return false
      return args.netuid === targetNetuid && args.hotkey === targetHotkey

    case "remove_stake":
    case "remove_stake_limit":
    case "remove_stake_full_limit":
      // Only matches "sell" direction
      // Args: { hotkey, netuid, amount_unstaked, [limit_price, allow_partial] }
      if (direction !== "sell") return false
      return args.netuid === targetNetuid && args.hotkey === targetHotkey

    // === Unstake all (no netuid) ===
    case "unstake_all":
    case "unstake_all_alpha":
      // Only matches "sell" direction, but we can't match by netuid
      // Args: { hotkey }
      // These unstake from ALL subnets, so we just check the hotkey
      if (direction !== "sell") return false
      return args.hotkey === targetHotkey

    // === Move stake (changes hotkey and/or netuid) ===
    case "move_stake":
      // Args: { origin_hotkey, destination_hotkey, origin_netuid, destination_netuid, alpha_amount }
      // Emits StakeRemoved for origin, StakeAdded for destination
      if (direction === "sell") {
        return args.origin_netuid === targetNetuid && args.origin_hotkey === targetHotkey
      } else {
        return args.destination_netuid === targetNetuid && args.destination_hotkey === targetHotkey
      }

    // === Transfer stake (changes coldkey, keeps hotkey) ===
    case "transfer_stake":
      // Args: { destination_coldkey, hotkey, origin_netuid, destination_netuid, alpha_amount }
      // Emits StakeRemoved for origin, StakeAdded for destination (same hotkey)
      if (direction === "sell") {
        return args.origin_netuid === targetNetuid && args.hotkey === targetHotkey
      } else {
        return args.destination_netuid === targetNetuid && args.hotkey === targetHotkey
      }

    // === Swap stake (changes netuid, keeps coldkey/hotkey) ===
    case "swap_stake":
    case "swap_stake_limit":
      // Args: { hotkey, origin_netuid, destination_netuid, alpha_amount, [limit_price, allow_partial] }
      // Emits StakeRemoved for origin, StakeAdded for destination
      if (direction === "sell") {
        return args.origin_netuid === targetNetuid && args.hotkey === targetHotkey
      } else {
        return args.destination_netuid === targetNetuid && args.hotkey === targetHotkey
      }

    default:
      return false
  }
}

/**
 * Extracts the coldkey address from a Proxy.proxy or Proxy.proxy_announced "real" field.
 * The "real" field can be a raw string (SS58 address) or an object with a "value" property.
 */
export const extractProxyColdkey = (real: unknown): string | null => {
  if (typeof real === "string") return real
  if (
    real &&
    typeof real === "object" &&
    "value" in real &&
    typeof (real as { value: unknown }).value === "string"
  ) {
    return (real as { value: string }).value
  }
  return null
}

/**
 * Recursively search through a decoded call tree to find SubtensorModule staking calls.
 * Handles common wrapper patterns like proxy, batch, multisig, etc.
 *
 * @param call - The decoded call to search
 * @param targetNetuid - The netuid to match
 * @param targetHotkey - The hotkey to match
 * @param targetColdkey - The coldkey to match (from the event, ensures correct call in batch with many proxy calls)
 * @param direction - "buy" for add_stake variants, "sell" for remove_stake variants
 * @param effectiveColdkey - The coldkey context from enclosing proxy calls (internal use)
 * @returns The matching SubtensorModule call, or null if not found
 */
export const findSubtensorStakeCall = (
  call: DecodedCall | PapiCall | null,
  targetNetuid: number,
  targetHotkey: string,
  targetColdkey: string,
  direction: "buy" | "sell",
  effectiveColdkey?: string
): (DecodedCall & { method: SubtensorStakeCallType }) | null => {
  // Normalize the call to DecodedCall format (handles both PAPI and DecodedCall formats)
  const normalizedCall = normalizeCall(call)
  if (!normalizedCall) return null

  const { pallet, method, args } = normalizedCall

  // Direct match - check if this is a SubtensorModule staking call
  if (pallet === "SubtensorModule") {
    const argsObj = args as Record<string, unknown>
    // Verify coldkey matches if we have context from an enclosing proxy
    const coldkeyMatches = !effectiveColdkey || effectiveColdkey === targetColdkey
    if (
      coldkeyMatches &&
      matchesSubtensorStakeCall(method, argsObj, targetNetuid, targetHotkey, direction)
    ) {
      return normalizedCall as DecodedCall & { method: SubtensorStakeCallType }
    }
  }

  // Handle wrapper pallets that contain nested calls
  const argsObj = args as Record<string, unknown>

  // Proxy.proxy, Proxy.proxyAnnounced - has a "call" field
  // The "real" field indicates the actual coldkey being acted on behalf of
  if (pallet === "Proxy" && (method === "proxy" || method === "proxy_announced")) {
    const proxyColdkey = extractProxyColdkey(argsObj.real)
    const nestedCall = argsObj.call
    if (nestedCall) {
      // Pass the proxy's "real" as the effective coldkey for nested calls
      const found = findSubtensorStakeCall(
        nestedCall as DecodedCall | PapiCall,
        targetNetuid,
        targetHotkey,
        targetColdkey,
        direction,
        proxyColdkey ?? effectiveColdkey
      )
      if (found) return found
    }
  }

  // Utility.batch, Utility.batchAll, Utility.forceBatch - has a "calls" array
  if (
    pallet === "Utility" &&
    (method === "batch" || method === "batch_all" || method === "force_batch")
  ) {
    const calls = argsObj.calls as Array<DecodedCall | PapiCall> | undefined
    if (calls) {
      for (const nestedCall of calls) {
        const found = findSubtensorStakeCall(
          nestedCall,
          targetNetuid,
          targetHotkey,
          targetColdkey,
          direction,
          effectiveColdkey
        )
        if (found) return found
      }
    }
  }

  // Utility.asDerivative, Utility.dispatchAs - has a "call" field
  if (
    pallet === "Utility" &&
    (method === "as_derivative" || method === "dispatch_as" || method === "with_weight")
  ) {
    const nestedCall = argsObj.call
    if (nestedCall) {
      const found = findSubtensorStakeCall(
        nestedCall as DecodedCall | PapiCall,
        targetNetuid,
        targetHotkey,
        targetColdkey,
        direction,
        effectiveColdkey
      )
      if (found) return found
    }
  }

  // Multisig.asMulti, Multisig.asMultiThreshold1 - has a "call" field
  if (pallet === "Multisig" && (method === "as_multi" || method === "as_multi_threshold_1")) {
    const nestedCall = argsObj.call
    if (nestedCall) {
      const found = findSubtensorStakeCall(
        nestedCall as DecodedCall | PapiCall,
        targetNetuid,
        targetHotkey,
        targetColdkey,
        direction,
        effectiveColdkey
      )
      if (found) return found
    }
  }

  // Scheduler.schedule, Scheduler.scheduleAfter - has a "call" field
  if (
    pallet === "Scheduler" &&
    (method === "schedule" ||
      method === "schedule_after" ||
      method === "schedule_named" ||
      method === "schedule_named_after")
  ) {
    const nestedCall = argsObj.call
    if (nestedCall) {
      const found = findSubtensorStakeCall(
        nestedCall as DecodedCall | PapiCall,
        targetNetuid,
        targetHotkey,
        targetColdkey,
        direction,
        effectiveColdkey
      )
      if (found) return found
    }
  }

  // Sudo.sudo, Sudo.sudoAs - has a "call" field
  if (
    pallet === "Sudo" &&
    (method === "sudo" || method === "sudo_as" || method === "sudo_unchecked_weight")
  ) {
    const nestedCall = argsObj.call
    if (nestedCall) {
      const found = findSubtensorStakeCall(
        nestedCall as DecodedCall | PapiCall,
        targetNetuid,
        targetHotkey,
        targetColdkey,
        direction,
        effectiveColdkey
      )
      if (found) return found
    }
  }

  return null
}

/**
 * Determines the operation type from a SubtensorModule staking call.
 *
 * Priority for move_stake/transfer_stake:
 * 1. change_subnet - if netuid changes (highest priority)
 * 2. change_validator - if hotkey changes (for move_stake)
 * 3. transfer - if only coldkey changes (for transfer_stake with same netuid)
 */
export const getOperationType = (
  call: DecodedCall & { method: SubtensorStakeCallType }
): StakingOperationType => {
  const args = call.args as Record<string, unknown>

  switch (call.method) {
    // Simple staking
    case "add_stake":
      return "stake"
    case "add_stake_limit":
      return "stake_limit"

    // Simple unstaking
    case "remove_stake":
      return "unstake"
    case "remove_stake_limit":
    case "remove_stake_full_limit":
      return "unstake_limit"

    // Unstake all variants
    case "unstake_all":
    case "unstake_all_alpha":
      return "unstake_all"

    // Move stake - can change both hotkey and netuid
    case "move_stake": {
      const originNetuid = args.origin_netuid
      const destNetuid = args.destination_netuid
      const originHotkey = args.origin_hotkey
      const destHotkey = args.destination_hotkey

      // change_subnet has priority over change_validator
      if (originNetuid !== destNetuid) return "change_subnet"
      if (originHotkey !== destHotkey) return "change_validator"
      // Same hotkey and netuid - shouldn't happen but fallback
      return "unknown"
    }

    // Transfer stake - changes coldkey, can change netuid
    case "transfer_stake": {
      const originNetuid = args.origin_netuid
      const destNetuid = args.destination_netuid

      if (originNetuid !== destNetuid) return "change_subnet"
      // Same netuid but different coldkey - this is a transfer of ownership
      return "transfer"
    }

    // Swap stake - always changes netuid
    case "swap_stake":
    case "swap_stake_limit":
      return "change_subnet"

    default:
      return "unknown"
  }
}
