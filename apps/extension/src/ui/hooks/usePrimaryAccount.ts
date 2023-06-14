import { AccountJsonAny, AccountType, storedSeedAccountTypes } from "@core/domains/accounts/types"
import { api } from "@ui/api"
import { useMemo } from "react"
import { atom, useRecoilValue } from "recoil"

// only use for this purpose, to leverage suspense
// do not use this in useAccounts as it raises performance issues
const accountsState = atom<AccountJsonAny[]>({
  key: "accountsState",
  effects: [
    ({ setSelf }) => {
      const unsubscribe = api.accountsSubscribe(setSelf)
      return () => unsubscribe()
    },
  ],
})

/**
 *
 * @param storedSeedOnly causes the function to return only accounts derived from a seed stored in Talisman. Returns that account if it
 * exists, or the first account present if not, by default
 * @returns an Account
 */
export const usePrimaryAccount = (storedSeedOnly?: boolean) => {
  const accounts = useRecoilValue(accountsState)

  const storedSeedAccount = useMemo(
    () => accounts.find(({ origin }) => storedSeedAccountTypes.includes(origin as AccountType)),
    [accounts]
  )
  if (storedSeedOnly) return storedSeedAccount
  if (accounts.length > 0) return accounts[0]
  return
}
