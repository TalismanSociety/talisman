import { useMemo } from "react"

import { useAccounts } from "@ui/state"

export const useQrCodeAccounts = () => {
  const accounts = useAccounts()
  return useMemo(() => accounts.filter((account) => account.isQr), [accounts])
}
