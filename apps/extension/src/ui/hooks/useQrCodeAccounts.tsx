import { useAccounts } from "@ui/state"
import { isAccountOfType } from "extension-core"
import { useMemo } from "react"

export const useQrCodeAccounts = () => {
  const accounts = useAccounts()
  return useMemo(
    () => accounts.filter((account) => isAccountOfType(account, "polkadot-vault")),
    [accounts]
  )
}
