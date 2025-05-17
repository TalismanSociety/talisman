import { AuthorizedSite } from "extension-core"
import { isTalismanUrl } from "extension-shared"
import { useMemo } from "react"

import { useAccounts, useSettingValue } from "@ui/state"

export const useAccountsForSite = (site: AuthorizedSite | string | null) => {
  const url = typeof site === "string" ? site : site?.url
  const isTalismanApp = isTalismanUrl(url)
  const developerMode = useSettingValue("developerMode")

  const allAccounts = useAccounts("all")

  return useMemo(
    () =>
      allAccounts.filter((a) => {
        // same logic as in getPublicAccounts
        if (developerMode) return true
        if (isTalismanApp) return a.type !== "contact"
        return !["watch-only", "contact"].includes(a.type)
      }),
    [allAccounts, developerMode, isTalismanApp],
  )
}
