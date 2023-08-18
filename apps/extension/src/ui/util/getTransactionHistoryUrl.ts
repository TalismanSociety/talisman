import { TALISMAN_WEB_APP_TX_HISTORY_URL } from "@core/constants"

export const getTransactionHistoryUrl = (address?: string) => {
  if (!address) return TALISMAN_WEB_APP_TX_HISTORY_URL

  const url = new URL(TALISMAN_WEB_APP_TX_HISTORY_URL)
  url.searchParams.set("address", address)
  return url.toString()
}
