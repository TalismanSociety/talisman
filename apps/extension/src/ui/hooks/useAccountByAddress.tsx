import { useMemo } from "react"
import { encodeAnyAddress } from "@core/util"
import useAccounts from "./useAccounts"
import { AccountJson } from "@polkadot/extension-base/background/types"

const filterByUnencodedAddress =
  (address: string) =>
  (account: AccountJson): boolean =>
    account.address === address
const filterByEncodedAddress = (address: string) =>
  filterByUnencodedAddress(encodeAnyAddress(address, 42))

const useAccountByAddress = (address: string) => {
  const accounts = useAccounts()

  const account = useMemo(() => {
    if (!address || !accounts) return null

    return (
      accounts.find(filterByUnencodedAddress(address)) ??
      accounts.find(filterByEncodedAddress(address)) ??
      null
    )
  }, [accounts, address])

  return account
}

export default useAccountByAddress
