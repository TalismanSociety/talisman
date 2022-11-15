const TX_HISTORY_PAGE_URL = "https://app.talisman.xyz/history"

export const getTransactionHistoryUrl = (address?: string) => {
  if (!address) return TX_HISTORY_PAGE_URL

  const qs = new URLSearchParams()
  qs.set("address", address)
  return `${TX_HISTORY_PAGE_URL}?${qs}`
}
