import { provideContext } from "@talisman/util/provideContext"
import useAccounts from "@ui/hooks/useAccounts"
import { useMemo, useState } from "react"

const useSelectedAccountProvider = () => {
  const accounts = useAccounts()
  const [selectedAddress, setSelectedAddress] = useState<string>()

  const account = useMemo(
    () => accounts.find((account) => account.address === selectedAddress),
    [accounts, selectedAddress]
  )

  return { setSelectedAddress, accounts, account }
}

export const [SelectedAccountProvider, useSelectedAccount] = provideContext(
  useSelectedAccountProvider
)
