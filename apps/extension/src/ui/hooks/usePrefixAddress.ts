import { convertAddress } from "@talisman/util/convertAddress"
import useAccounts from "@ui/hooks/useAccounts"
import { useMemo } from "react"

import { useAddressBook } from "./useAddressBook"

export const usePrefixAddress = (address: string, chainPrefix: number | null) => {
  // format address using selected chain's prefix
  const formattedAddress = useMemo(
    () => convertAddress(address, chainPrefix),
    [address, chainPrefix]
  )

  // detect if address matches the prefix
  const isConverted = useMemo(
    () => address && address !== formattedAddress,
    [address, formattedAddress]
  )

  // search for associated account's name
  const accounts = useAccounts()
  const { contacts } = useAddressBook()
  const accountName = useMemo(() => {
    const baseAddress = convertAddress(address, null)
    const accountName = accounts.find((a) => a.address === baseAddress)?.name
    if (accountName) return accountName

    return contacts.find((c) => convertAddress(c.address, null) === baseAddress)?.name
  }, [accounts, contacts, address])

  return {
    formattedAddress,
    isConverted,
    accountName,
  }
}
