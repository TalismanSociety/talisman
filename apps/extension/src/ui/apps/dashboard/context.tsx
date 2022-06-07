import { provideContext } from "@talisman/util/provideContext"
import useAccounts from "@ui/hooks/useAccounts"
import { useMemo, useState } from "react"

const useDashboardProvider = () => {
  const [selectedAddress, setSelectedAddress] = useState<string>()

  const accounts = useAccounts()

  const account = useMemo(
    () => accounts.find((account) => account.address === selectedAddress) ?? accounts[0],
    [accounts, selectedAddress]
  )

  return { setSelectedAddress, accounts, account }
}

export const [DashboardProvider, useDashboard] = provideContext(useDashboardProvider)
