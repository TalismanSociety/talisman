import { AuthorizedSite } from "@core/domains/sitesAuthorised/types"
import { isTalismanUrl } from "@core/page"

import useAccounts from "./useAccounts"

export const useAccountsForSite = (site: AuthorizedSite | null) => {
  return useAccounts(isTalismanUrl(site?.url) ? "all" : "owned")
}
