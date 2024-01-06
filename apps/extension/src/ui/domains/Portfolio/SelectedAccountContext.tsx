import { AccountJsonAny } from "@core/domains/accounts/types"
import useAccounts from "@ui/hooks/useAccounts"
import { useSearchParamsSelectedAccount } from "@ui/hooks/useSearchParamsSelectedAccount"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback, useMemo } from "react"

const isPopup = window.location.pathname === "/popup.html"

export const useSelectedAccount = () => {
  //if isPopup = true, then use account from search parameters.
  const { account: popupAccount } = useSearchParamsSelectedAccount()
  //if isPopup = false, then use address persisted in settings
  const [selectedAccountAddress, setSelectedAccountAddress] = useSetting("selectedAccount")

  const accounts = useAccounts()

  const account = useMemo(
    () =>
      isPopup
        ? popupAccount
        : accounts.find((account) => account.address === selectedAccountAddress),
    [accounts, popupAccount, selectedAccountAddress]
  )

  const select = useCallback(
    (accountOrAddress: AccountJsonAny | string | undefined) => {
      // in popup, account is selected via url params so this will be a noop
      if (isPopup) return

      const address =
        typeof accountOrAddress === "string" ? accountOrAddress : accountOrAddress?.address
      if (address === undefined || accounts.some((acc) => acc.address === address))
        setSelectedAccountAddress(address)
    },
    [accounts, setSelectedAccountAddress]
  )

  return { select, accounts, account }
}
