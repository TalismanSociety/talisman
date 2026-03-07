import { isAccountOfType } from "@core/domains/keyring/exports"
import { useAccounts } from "@ui/state/accounts"
import { useMemo } from "react"

export const useQrCodeAccounts = () => {
  const accounts = useAccounts()
  return useMemo(
    () => accounts.filter((account) => isAccountOfType(account, "polkadot-vault")),
    [accounts]
  )
}
