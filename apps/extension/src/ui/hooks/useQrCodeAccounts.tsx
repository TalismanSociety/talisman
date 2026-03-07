import { isAccountOfType } from "@core"
import { useAccounts } from "@ui/state"
import { useMemo } from "react"

export const useQrCodeAccounts = () => {
  const accounts = useAccounts()
  return useMemo(
    () => accounts.filter((account) => isAccountOfType(account, "polkadot-vault")),
    [accounts]
  )
}
