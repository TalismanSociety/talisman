import { useMemo } from "react"
import { TokenId } from "@core/types"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"

export const useBalance = (address: string, tokenId: TokenId) => {
  const balances = useBalancesByAddress(address)

  return useMemo(
    () => [...balances.find({ address, tokenId })][0] || undefined,
    [address, balances, tokenId]
  )
}
