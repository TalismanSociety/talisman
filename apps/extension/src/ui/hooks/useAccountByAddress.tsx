import { AccountJsonAny } from "@extension/core"
import { encodeAnyAddress } from "@talismn/util"
import { accountsMapAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"
import { useMemo } from "react"

export const useAccountByAddress = (address?: string | null) => {
  // use this instead of accountsByAddressAtomFamily(address) to prevent triggering suspense on first mount for each address
  const accountsMap = useAtomValue(accountsMapAtom)

  return useMemo<AccountJsonAny | null>(() => {
    if (!address) return null
    if (accountsMap[address]) return accountsMap[address] as AccountJsonAny
    try {
      // address may be encoded with a specific prefix
      const encoded = encodeAnyAddress(address, 42)
      if (accountsMap[encoded]) return accountsMap[encoded] as AccountJsonAny
    } catch (err) {
      // invalid address
    }
    return null
  }, [accountsMap, address])
}
