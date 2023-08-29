import { AccountJsonAny } from "@core/domains/accounts/types"
import { ProviderType } from "@core/domains/sitesAuthorised/types"
import { isTalismanHostname } from "@core/page"
import { useMemo, useState } from "react"

import useAccounts from "./useAccounts"
import useAuthorisedSiteById from "./useAuthorisedSiteById"

export const useConnectedAccounts = (siteId: string, providerType: ProviderType) => {
  const { connected, toggleOne, url } = useAuthorisedSiteById(siteId, providerType)
  const allAccounts = useAccounts(isTalismanHostname(url) ? "all" : "owned")
  const [showEthAccounts, setShowEthAccounts] = useState(
    allAccounts?.some((a) => connected.includes(a.address) && a.type === "ethereum")
  )

  const accounts = useMemo(
    () =>
      allAccounts
        .filter(({ type }) =>
          providerType === "polkadot" ? showEthAccounts || type !== "ethereum" : type === "ethereum"
        )
        .map((account): AccountJsonAny & { isConnected: boolean; toggle: () => void } => ({
          ...account,
          isConnected: connected.includes(account.address),
          toggle: () => toggleOne(account.address),
        })),
    [allAccounts, providerType, showEthAccounts, connected, toggleOne]
  )

  return { accounts, showEthAccounts, setShowEthAccounts }
}
