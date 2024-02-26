import { TokenId } from "@core/domains/tokens/types"
import { balancesAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"
import { useMemo } from "react"

export const useBalance = (address: string, tokenId: TokenId) => {
  const balances = useAtomValue(balancesAtomFamily({ address, tokenId }))
  return useMemo(() => [...balances][0], [balances])
}
