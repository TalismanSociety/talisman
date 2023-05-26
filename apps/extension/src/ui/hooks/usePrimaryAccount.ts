import { AccountMeta, AccountType, storedSeedAccountTypes } from "@core/domains/accounts/types"

import useAccounts from "./useAccounts"

/**
 *
 * @param storedSeedOnly causes the function to return only accounts derived from a seed stored in Talisman. Returns that account if it
 * exists, or the first account present if not, by default
 * @returns an Account
 */
export const usePrimaryAccount = (storedSeedOnly?: boolean) => {
  const accounts = useAccounts()
  const storedSeedAccount = accounts.find(
    ({ meta }) =>
      meta && storedSeedAccountTypes.includes((meta as AccountMeta).origin as AccountType)
  )

  if (storedSeedOnly) return storedSeedAccount
  if (accounts.length > 0) return accounts[0]
  return
}
