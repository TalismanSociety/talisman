import { getDTaoSubnetUnstakeInfo } from "@ui/domains/Staking/Bittensor/utils/dtaoSubnetUnstakeInfo"
import { useBalances } from "@ui/state/balances"
import { useToken } from "@ui/state/chaindata"
import { useMemo } from "react"

/**
 * Subnet-wide available amount for dtao (staked TAO/alpha) tokens: the portion of the stake
 * not pinned by a conviction lock. The chain ALLOWS transferring beyond it — the lock and a
 * pro-rata share of its conviction follow the stake to the recipient — so the send flow uses
 * this to warn (not block) when a transfer dips into the locked portion.
 *
 * Returns null for other token types.
 */
export const useDTaoSubnetAvailable = (
  address: string | null | undefined,
  tokenId: string | null | undefined
): bigint | null => {
  const token = useToken(tokenId)
  const balances = useBalances("owned")

  return useMemo(() => {
    if (!address || token?.type !== "substrate-dtao" || typeof token.netuid !== "number")
      return null
    return getDTaoSubnetUnstakeInfo(balances, address, token.networkId, token.netuid).available
  }, [address, token, balances])
}
