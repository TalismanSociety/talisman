import { useAccounts } from "@ui/state"

import { useAccountColors } from "./useAccountColors"

export const useFirstAccountColors = () => {
  // pick first account and apply it's colors to background
  const [account] = useAccounts()

  return useAccountColors(account?.address)
}
