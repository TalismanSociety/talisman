import { AuthorizedSite, ProviderType } from "@core/types"
import { api } from "@ui/api"
import { useCallback, useMemo } from "react"
import useAccounts from "./useAccounts"
import useAuthorisedSiteById from "./useAuthorisedSiteById"

export const useConnectedAccounts = (siteId: string, providerType: ProviderType) => {
  const allAccounts = useAccounts()
  const { connected } = useAuthorisedSiteById(siteId, providerType)

  const handleConnect = useCallback(
    (address: string) => (connect: boolean) => {
      let update = {} as Partial<AuthorizedSite>
      switch (providerType) {
        case "polkadot":
          // multi
          update.addresses = connect
            ? [...connected, address]
            : connected.filter((a) => a !== address)
          break
        case "ethereum":
          // mono
          update.ethAddresses = connect ? [address] : []
          break
        default:
          throw new Error("Unsupported provider type")
      }
      return api.authorizedSiteUpdate(siteId, update)
    },
    [connected, providerType, siteId]
  )

  const accounts = useMemo(
    () =>
      allAccounts
        .filter(({ type }) => providerType !== "ethereum" || type === "ethereum")
        .map((account) => ({
          ...account,
          isConnected: connected.includes(account.address),
          connect: handleConnect(account.address),
        })),
    [allAccounts, connected, handleConnect, providerType]
  )

  return accounts
}
