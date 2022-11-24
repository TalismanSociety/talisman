const TX_HISTORY_PAGE_URL = "https://app.talisman.xyz/history"

export const getTransactionHistoryUrl = (address?: string) => {
  if (!address) return TX_HISTORY_PAGE_URL

  const url = new URL(TX_HISTORY_PAGE_URL)
  url.searchParams.set("address", address)
  return url.toString()
}
