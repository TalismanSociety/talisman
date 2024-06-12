import { AuthorizedSite } from "@extension/core"
import { isTalismanUrl } from "@extension/shared"

import useAccounts from "./useAccounts"

export const useAccountsForSite = (site: AuthorizedSite | string | null) => {
  const url = typeof site === "string" ? site : site?.url
  const requestUrlIsTalisman = isTalismanUrl(url)
  const allOrOwnedAccounts = useAccounts(requestUrlIsTalisman ? "all" : "owned")
  const signetAccounts = useAccounts("signet")

  // returns all if url is talisman, else return owned + signet accounts
  return requestUrlIsTalisman ? allOrOwnedAccounts : [...allOrOwnedAccounts, ...signetAccounts]
}
