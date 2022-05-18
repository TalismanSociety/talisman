import useAccounts from "./useAccounts"

const useAccountAddresses = (ethereumOnly?: boolean): string[] => {
  const accounts = useAccounts()
  return accounts
    .filter(({ type }) => !ethereumOnly || type === "ethereum")
    .map(({ address }) => address)
}

export default useAccountAddresses
