import { TokenId } from "@core/domains/tokens/types"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useMemo } from "react"

export const useBalance = (address: string, tokenId: TokenId) => {
  const balances = useBalancesByAddress(address)

  return useMemo(
    () => [...balances.find({ address, tokenId })][0] || undefined,
    [address, balances, tokenId]
  )
}
