import type { IChainConnectorDot } from "@talismn/chain-connectors"

import log from "../../log"
import { fetchRuntimeCallResult, hasRuntimeApi } from "../shared"
import { parseMetadataRpcCached } from "../shared/parseMetadataRpcCached"

/** label of the claimable-rewards values emitted on root staking balances */
export const CLAIMABLE_REWARDS_LABEL = "Claimable rewards"

export type FetchedBasketClaim = {
  address: string
  /** validator hotkey the claim redeems from; null for the unattributed remainder */
  hotkey: string | null
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
 * Any residue of the coldkey-wide `get_root_basket_owed` total is reported with a null
 * hotkey so it can surface on the root base token — both calls iterate the same chain-side
 * index, so the residue should always be zero.
 */
export const fetchBasketClaims = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  addresses: string[]
): Promise<FetchedBasketClaim[]> => {
  if (!addresses.length) return []

  const { unifiedMetadata, builder } = parseMetadataRpcCached(metadataRpc)
  if (
    !hasRuntimeApi(unifiedMetadata, "BetaBasketRuntimeApi", "get_root_basket_owed") ||
    !hasRuntimeApi(unifiedMetadata, "BetaBasketRuntimeApi", "get_root_basket_positions")
  )
    return []

  try {
    const owedByAddress = new Map(
      await Promise.all(
        addresses.map(
          async (address): Promise<[string, bigint]> => [
            address,
            await fetchRuntimeCallResult<bigint>(
              connector,
              networkId,
              builder,
              "BetaBasketRuntimeApi",
              "get_root_basket_owed",
              [address]
            ),
          ]
        )
      )
    )

    // per-validator attribution is only worth querying when the coldkey is owed anything
    const addressesToQuery = addresses.filter((address) => (owedByAddress.get(address) ?? 0n) > 0n)
    const positionsByAddress = await Promise.all(
      addressesToQuery.map(
        async (address): Promise<[string, BasketPosition[]]> => [
          address,
          await fetchRuntimeCallResult<BasketPosition[]>(
            connector,
            networkId,
            builder,
            "BetaBasketRuntimeApi",
            "get_root_basket_positions",
            [address]
          ),
        ]
      )
    )

    const claims: FetchedBasketClaim[] = positionsByAddress.flatMap(([address, positions]) =>
      positions
        .filter(([, , payoutTao]) => payoutTao > 0n)
        .map(([hotkey, , payoutTao]) => ({ address, hotkey, amount: payoutTao }))
    )

    for (const [address, owed] of owedByAddress) {
      const attributed = claims.reduce(
        (sum, claim) => (claim.address === address ? sum + claim.amount : sum),
        0n
      )
      const remainder = owed - attributed
      if (remainder > 0n) claims.push({ address, hotkey: null, amount: remainder })
    }

    return claims
  } catch (cause) {
    // an empty result reads as "nothing claimable" and deletes claim-only balances for this
    // poll (they flap back in on the next good one) — transient failures must fail the poll
    // (balances go stale) instead
    log.warn(`Failed to fetch beta basket claims on ${networkId}`, { cause })
    throw cause
  }
}
