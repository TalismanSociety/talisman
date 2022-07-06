import { Balances } from "@core/domains/balances/types"
import { Address } from "@core/types/base"
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
