import { useAccountColors } from "./useAccountColors"
import useAccounts from "./useAccounts"

export const useFirstAccountColors = () => {
  // pick first account and apply it's colors to background
  const [account] = useAccounts()

  return useAccountColors(account?.address)
}
