import { useAccounts } from "@ui/state"

export const useQrCodeAccounts = () => {
  const accounts = useAccounts()
  return accounts.filter((account) => account.isQr)
}
