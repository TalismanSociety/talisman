import { Address } from "@core/types/base"
import useBalances from "@ui/hooks/useBalances"
import { useMemo } from "react"

const useBalancesByAddress = (address: Address) => {
  // TODO would be nice to subscribe only to this address's balances changes
  const balances = useBalances()

  return useMemo(() => balances.find({ address }), [address, balances])
}

export default useBalancesByAddress
