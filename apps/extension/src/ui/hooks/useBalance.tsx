import { TokenId } from "@core/domains/tokens/types"
import { balancesQuery } from "@ui/atoms"
import { useMemo } from "react"
import { useRecoilValue } from "recoil"

export const useBalance = (address: string, tokenId: TokenId) => {
  const balances = useRecoilValue(balancesQuery({ address, tokenId }))
  return useMemo(() => [...balances][0], [balances])
}
