import { AccountJsonAny } from "@core/domains/accounts/types"
import { accountByAddressQuery, accountsQuery } from "@ui/atoms"
import { useSearchParamsSelectedAccount } from "@ui/hooks/useSearchParamsSelectedAccount"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback } from "react"
import { useRecoilValue } from "recoil"

const isPopup = window.location.pathname === "/popup.html"

export const useSelectedAccount = () => {
  const accounts = useRecoilValue(accountsQuery("all"))
  const [selectedAccountAddress, setSelectedAccountAddress] = useSetting("selectedAccount")

  const accountPopup = useSearchParamsSelectedAccount()
  const dashboardAccount = useRecoilValue(accountByAddressQuery(selectedAccountAddress))

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
