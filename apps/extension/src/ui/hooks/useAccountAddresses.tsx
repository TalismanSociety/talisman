import useAccounts from "./useAccounts"

export const useAccountAddresses = (ethereumOnly?: boolean): string[] => {
  const accounts = useAccounts()
  return accounts
    .filter(({ type }) => !ethereumOnly || type === "ethereum")
    .map(({ address }) => address)
}
