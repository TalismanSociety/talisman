import { Address, Balances } from "@core/types"
import useBalances from "@ui/hooks/useBalances"
import { useEffect, useState } from "react"

const useBalancesByAddress = (address: Address) => {
  const balances = useBalances()
  const [byAddress, setByAddress] = useState<Balances>(new Balances([]))

  useEffect(() => {
    setByAddress(balances?.find({ address }) || new Balances([]))
  }, [balances, address])

  return byAddress
}

export default useBalancesByAddress
