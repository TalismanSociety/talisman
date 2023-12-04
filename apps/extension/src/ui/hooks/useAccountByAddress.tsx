import { AccountJsonAny } from "@core/domains/accounts/types"
import { encodeAnyAddress } from "@talismn/util"
import { useMemo } from "react"

import useAccounts from "./useAccounts"

const filterByUnencodedAddress =
  (address: string) =>
  (account: AccountJsonAny): boolean =>
    account.address === address

const filterByEncodedAddress = (address: string) => {
  try {
    return filterByUnencodedAddress(encodeAnyAddress(address, 42))
  } catch (e) {
    // address is not valid
    return () => false
  }
}

export const useAccountByAddress = (address?: string | null) => {
  const accounts = useAccounts()

  const account = useMemo<AccountJsonAny | null>(() => {
    if (!address || !accounts) return null

    return (
      accounts.find(filterByUnencodedAddress(address)) ??
      accounts.find(filterByEncodedAddress(address)) ??
      null
    )
  }, [accounts, address])

  return account
}
