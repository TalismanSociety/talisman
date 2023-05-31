import useAccounts from "./useAccounts"

export const useQrCodeAccounts = () => {
  const accounts = useAccounts()
  return accounts.filter((account) => account.isQr)
}
