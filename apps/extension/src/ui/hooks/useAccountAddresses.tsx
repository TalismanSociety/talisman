import { AccountCategory } from "@ui/atoms"

import { useAccounts } from "./useAccounts"

/**
 *
 * @param ethereumOnly causes the function to return only ethereum addresses. Returns all addresses by default
 * @returns array of addresses of accounts
 */
export const useAccountAddresses = (
  ethereumOnly?: boolean,
  accountFilter?: AccountCategory
): string[] => {
  const accounts = useAccounts(accountFilter)
  return accounts
    .filter(({ type }) => !ethereumOnly || type === "ethereum")
    .map(({ address }) => address)
}
