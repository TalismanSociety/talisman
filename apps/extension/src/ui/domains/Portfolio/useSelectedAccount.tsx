import { AccountJsonAny } from "@extension/core"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useAccounts from "@ui/hooks/useAccounts"
import { useSearchParamsSelectedAccount } from "@ui/hooks/useSearchParamsSelectedAccount"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback } from "react"

const isPopup = window.location.pathname === "/popup.html"

export const useSelectedAccount = () => {
  const [selectedAccountAddress, setSelectedAccountAddress] = useSetting("selectedAccount")
  const accounts = useAccounts()

  const accountPopup = useSearchParamsSelectedAccount()
  const dashboardAccount = useAccountByAddress(selectedAccountAddress)

  const select = useCallback(
    (accountOrAddress: AccountJsonAny | string | undefined) => {
      // in popup, account is selected via url params so this will be a noop
      if (isPopup) return

      const address =
        typeof accountOrAddress === "string" ? accountOrAddress : accountOrAddress?.address
      if (address === undefined || accounts.some((acc) => acc.address === address))
        setSelectedAccountAddress(address)
    },
    [setSelectedAccountAddress, accounts]
  )

  const account = (isPopup ? accountPopup : dashboardAccount) ?? undefined

  return { select, accounts, account }
}
