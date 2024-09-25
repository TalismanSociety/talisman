import { usePortfolioNavigation } from "./usePortfolioNavigation"

// TODO yeet
export const useSelectedAccount = () => {
  // const [selectedAccountAddress, setSelectedAccountAddress] = useSetting("selectedAccount")
  //const allAccounts = useAccounts()

  const { selectedAccount, selectedAccounts } = usePortfolioNavigation()

  // const account = useMemo(() => {
  //   return allAccounts.find((acc) => accountAddress && isAddressEqual(acc.address, accountAddress)) ?? null
  // }, [])

  //const account = useSearchParamsSelectedAccount()
  //const dashboardAccount = useAccountByAddress(selectedAccountAddress)

  // const select = useCallback(
  //   (accountOrAddress: AccountJsonAny | string | undefined) => {
  //     // in popup, account is selected via url params so this will be a noop
  //     if (isPopup) return

  //     const address =
  //       typeof accountOrAddress === "string" ? accountOrAddress : accountOrAddress?.address
  //     if (address === undefined || accounts.some((acc) => acc.address === address))
  //       setSelectedAccountAddress(address)
  //   },
  //   [setSelectedAccountAddress, accounts]
  // )

  //const account = (isPopup ? accountPopup : dashboardAccount) ?? undefined

  return {
    //select,
    accounts: selectedAccounts,
    account: selectedAccount ?? undefined,
  }
}
