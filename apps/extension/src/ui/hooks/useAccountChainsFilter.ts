import { Address, Chain } from "@core/types"
import { useMemo } from "react"
import useAccountByAddress from "./useAccountByAddress"

export const useAccountChainsFilter = (chains: Chain[], address: Address) => {
  const account = useAccountByAddress(address)

  return useMemo(() => {
    return account?.isHardware
      ? chains.filter((c) => c.genesisHash === account.genesisHash)
      : chains
  }, [account, chains])
}
