import { AccountJsonAny } from "@core/domains/accounts/types"
import { selectedAccountState } from "@ui/atoms"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback } from "react"
import { useRecoilValue } from "recoil"

const isPopup = window.location.pathname === "/popup.html"

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
