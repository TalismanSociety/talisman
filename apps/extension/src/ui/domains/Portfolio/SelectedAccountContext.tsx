import { AccountJsonAny } from "@core/domains/accounts/types"
import { provideContext } from "@talisman/util/provideContext"
import useAccounts from "@ui/hooks/useAccounts"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback, useMemo, useState } from "react"

const useSelectedAccountProvider = ({ isPopup }: { isPopup?: boolean }) => {
  //if isPopup = true, then use in memory address.
  const [popupAccount, setPopupAccount] = useState<string>()
  //if isPopup = false, then use address persisted in settings
  const [selectedAccount, setSelectedAccount] = useSetting("selectedAccount")

  const accounts = useAccounts()

  const account = useMemo(
    () =>
      accounts.find((account) => account.address === (isPopup ? popupAccount : selectedAccount)),
    [accounts, isPopup, popupAccount, selectedAccount]
  )

  const select = useCallback(
    (accountOrAddress: AccountJsonAny | string | undefined) => {
      const address =
        typeof accountOrAddress === "string" ? accountOrAddress : accountOrAddress?.address
      if (address === undefined || accounts.some((acc) => acc.address === address))
        if (isPopup) setPopupAccount(address)
        else setSelectedAccount(address)
    },
    [accounts, isPopup, setSelectedAccount]
  )

  return { select, accounts, account }
}

export const [SelectedAccountProvider, useSelectedAccount] = provideContext(
  useSelectedAccountProvider
)
