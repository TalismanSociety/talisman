import type { IChainConnectorDot } from "@talismn/chain-connectors"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"

import log from "../../log"
import { fetchRuntimeCallResult, hasRuntimeApi } from "../shared"
import { parseMetadataRpcCached } from "../shared/parseMetadataRpcCached"

/** label of the claimable-rewards values emitted on root staking balances */
export const CLAIMABLE_REWARDS_LABEL = "Claimable rewards"

export const ROOT_NETUID = 0

// structural subset of the formatted locks exposed by Balance#locks,
// kept loose to avoid a circular dependency on the Balance class
type BalanceLockLike = {
  label: string
  amount: { planck: bigint }
}

/** Sum of a balance's claimable root rewards (TAO plancks, marked NAV quote) */
export const getDTaoClaimablePlancks = (locks: BalanceLockLike[] | null | undefined): bigint =>
  (locks ?? [])
    .filter((lock) => lock.label === CLAIMABLE_REWARDS_LABEL)
    .reduce((sum, lock) => sum + lock.amount.planck, 0n)

/** Identifies the entitlement to claim: claims are per (account, validator) pair */
export type DTaoClaimTarget = {
  networkId: DotNetworkId
  address: string
  /** validator whose basket entitlement to claim */
  hotkey: string
}

// structural subset of the Balance class, kept loose to avoid a circular dependency on it
type ClaimBalanceLike = {
  address: string
  token?: { type: string; networkId?: string; netuid?: number; hotkey?: string } | null
  locks: BalanceLockLike[]
}

/**
 * The target pair's claimable rewards, null once its entitlement is gone (eg claimed elsewhere).
 * Sourced from balances rather than staking positions: the chain keeps basket entitlement
 * after a full unstake, so a claim can have no stake left on its validator.
 */
export const findDTaoClaimablePlancks = (
  balances: ClaimBalanceLike[],
  { networkId, address, hotkey }: DTaoClaimTarget
): bigint | null => {
  const balance = balances.find(
    (b) =>
      b.token?.type === "substrate-dtao" &&
      b.token.networkId === networkId &&
      b.token.netuid === ROOT_NETUID &&
      b.token.hotkey === hotkey &&
      isAddressEqual(b.address, address)
  )

  const claimablePlancks = balance ? getDTaoClaimablePlancks(balance.locks) : 0n

  return claimablePlancks > 0n ? claimablePlancks : null
}

export type FetchedBasketClaim = {
  address: string
  /** validator hotkey the claim redeems from */
  hotkey: string
  amount: bigint
}

/** decoded element of `get_root_basket_positions`: one validator the coldkey holds owed shares on */
type BasketPosition = [hotkey: string, owedShares: bigint, payoutTao: bigint]

/**
 * Fetches the TAO each coldkey would realize by redeeming its validator beta baskets
 * (Bittensor spec 441 "Root Reborn": root dividends accrue in per-validator escrow funds
 * and must be claimed manually; the payout is TAO staked back onto the root position).
 *
 * Amounts are marked NAV quotes (BetaBasketRuntimeApi), so they move with subnet pool
 * prices as well as accrual. Attribution is per validator hotkey via
 * `get_root_basket_positions`, which walks the chain's own coldkey→hotkeys index and so
 * includes validators the coldkey fully unstaked from (entitlement survives unstaking).
 *
 * It is the only entitlement read: the coldkey-wide `get_root_basket_owed` total sums the
 * same positions, and claiming is per validator hotkey, so entitlement outside a position
 * would be unclaimable anyway.
 */
export const fetchBasketClaims = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  addresses: string[],
  at?: `0x${string}`
): Promise<FetchedBasketClaim[]> => {
  if (!addresses.length) return []

  const { unifiedMetadata, builder } = parseMetadataRpcCached(metadataRpc)
  if (!hasRuntimeApi(unifiedMetadata, "BetaBasketRuntimeApi", "get_root_basket_positions"))
    return []

  try {
    const positionsByAddress = await Promise.all(
      addresses.map(
        async (address): Promise<[string, BasketPosition[]]> => [
          address,
          await fetchRuntimeCallResult<BasketPosition[]>(
            connector,
            networkId,
            builder,
            "BetaBasketRuntimeApi",
            "get_root_basket_positions",
            [address],
            at
          ),
        ]
      )
    )

    return positionsByAddress.flatMap(([address, positions]) =>
      positions
        .filter(([, , payoutTao]) => payoutTao > 0n)
        .map(([hotkey, , payoutTao]) => ({ address, hotkey, amount: payoutTao }))
    )
  } catch (cause) {
    // an empty result reads as "nothing claimable" and deletes claim-only balances for this
    // poll (they flap back in on the next good one) — transient failures must fail the poll
    // (balances go stale) instead
    log.warn(`Failed to fetch beta basket claims on ${networkId}`, { cause })
    throw cause
  }
}
