import { useMemo } from "react"
import useBalances from "@ui/hooks/useBalances"
import { Address } from "@core/types"

const useBalancesByAddress = (address: Address) => {
  const balances = useBalances()

  return useMemo(() => balances.find({ address }), [balances, address])
}

export default useBalancesByAddress
