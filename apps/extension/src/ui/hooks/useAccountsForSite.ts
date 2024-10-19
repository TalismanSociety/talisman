import { AuthorizedSite } from "@extension/core"
import { isTalismanUrl } from "@extension/shared"
import { useAccounts, useSettingValue } from "@ui/state"

export const useAccountsForSite = (site: AuthorizedSite | string | null) => {
  const url = typeof site === "string" ? site : site?.url
  const requestUrlIsTalisman = isTalismanUrl(url)
  const isDevMode = useSettingValue("developerMode")
  const allOrOwnedAccounts = useAccounts(requestUrlIsTalisman || isDevMode ? "all" : "owned")
  const signetAccounts = useAccounts("signet")

  // returns all if url is talisman, else return owned + signet accounts
  return requestUrlIsTalisman ? allOrOwnedAccounts : [...allOrOwnedAccounts, ...signetAccounts]
}
