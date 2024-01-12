import { AccountJsonAny } from "@core/domains/accounts/types"
import { accountsQuery, settingQuery } from "@ui/atoms"
import { searchParamsSelectedAccount } from "@ui/hooks/useSearchParamsSelectedAccount"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback } from "react"
import { selector, useRecoilValue } from "recoil"

const isPopup = window.location.pathname === "/popup.html"

export const selectedAccountState = selector<{
  account: AccountJsonAny | undefined
  accounts: AccountJsonAny[]
}>({
  key: "selectedAccountState",
  get: ({ get }) => {
    const popupAccount = get(searchParamsSelectedAccount)
    const selectedAccountAddress = get(settingQuery("selectedAccount"))
    const accounts = get(accountsQuery("all"))

    const account = isPopup
      ? popupAccount
      : accounts.find((account) => account.address === selectedAccountAddress)

    return { account, accounts }
  },
})

export const useSelectedAccount = () => {
  const { account, accounts } = useRecoilValue(selectedAccountState)
  const [, setSelectedAccountAddress] = useSetting("selectedAccount")

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

  return { select, accounts, account }
}
