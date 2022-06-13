import { ProviderType } from "@core/types"
import { useMemo } from "react"
import useAccounts from "./useAccounts"
import useAuthorisedSiteById from "./useAuthorisedSiteById"

export const useConnectedAccounts = (siteId: string, providerType: ProviderType) => {
  const allAccounts = useAccounts()
  const { connected, toggleOne } = useAuthorisedSiteById(siteId, providerType)

  const accounts = useMemo(
    () =>
      allAccounts
        .filter(({ type }) => providerType !== "ethereum" || type === "ethereum")
        .map((account) => ({
          ...account,
          isConnected: connected.includes(account.address),
          connect: () => toggleOne(account.address),
        })),
    [allAccounts, connected, toggleOne, providerType]
  )

  return accounts
}
