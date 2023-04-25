import useAccounts from "./useAccounts"

/**
 *
 * @param ethereumOnly causes the function to return only ethereum addresses. Returns all addresses by default
 * @returns array of addresses of accounts
 */
export const useAccountAddresses = (ethereumOnly?: boolean): string[] => {
  const accounts = useAccounts()
  return accounts
    .filter(({ type }) => !ethereumOnly || type === "ethereum")
    .map(({ address }) => address)
}
