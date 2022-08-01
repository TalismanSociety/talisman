import { TokenId } from "@core/domains/tokens/types"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useEffect, useMemo } from "react"

export const useBalance = (address: string, tokenId: TokenId) => {
  const balances = useBalancesByAddress(address)

  const balance = useMemo(
    () => [...balances.find({ tokenId })][0] || undefined,
    [balances, tokenId]
  )

  // useEffect(() => {
  //   const test = balances.sorted.filter((b) => b.tokenId === tokenId)
  //   console.log("useBalance", address, tokenId, {
  //     test: test?.map((b) => b.toJSON()),
  //     balances: balances?.sorted?.map((b) => b.toJSON()),
  //   })
  // }, [address, balances, tokenId])
  // useEffect(
  //   () => console.log("useBalance", address, tokenId, { balance: balance?.toJSON() }),
  //   [address, balance, balances, tokenId]
  // )

  return balance
}
