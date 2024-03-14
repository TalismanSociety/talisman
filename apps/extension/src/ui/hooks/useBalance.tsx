import { TokenId } from "@extension/core"
import { balancesAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"
import { useMemo } from "react"

export const useBalance = (address: string, tokenId: TokenId) => {
  const balances = useAtomValue(balancesAtomFamily({ address, tokenId }))
  return useMemo(() => [...balances][0], [balances])
}
