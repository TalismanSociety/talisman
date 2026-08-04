import type { IChainConnectorDot } from "@talismn/chain-connectors"

import log from "../../log"
import { fetchRuntimeCallResult, hasRuntimeApi } from "../shared"
import { parseMetadataRpcCached } from "../shared/parseMetadataRpcCached"

/** label of the claimable-rewards values emitted on root staking balances */
export const CLAIMABLE_REWARDS_LABEL = "Claimable rewards"

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
