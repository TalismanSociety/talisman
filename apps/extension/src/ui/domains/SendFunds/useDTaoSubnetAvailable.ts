import { getDTaoSubnetUnstakeInfo } from "@ui/domains/Staking/Bittensor/utils/dtaoSubnetUnstakeInfo"
import { useBalances } from "@ui/state/balances"
import { useToken } from "@ui/state/chaindata"
import { useMemo } from "react"

/**
 * Subnet-wide available amount for dtao (staked TAO/alpha) tokens: the conviction locked
 * stake must not be transferred (the chain would silently transfer the lock to the recipient).
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
