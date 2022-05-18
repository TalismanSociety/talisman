import { useMemo } from "react"
import { AuthorizedSiteId, ProviderType } from "@core/types"
import { useAuthorisedSites } from "./useAuthorisedSites"

const useAuthorisedSiteProviders = (id: AuthorizedSiteId) => {
  const sites = useAuthorisedSites()
  const site = useMemo(() => sites?.[id], [sites, id])

  const { isPolkadotAuthorized, isEthereumAuthorized, authorizedProviders, defaultProvider } =
    useMemo(() => {
      const isPolkadotAuthorized = Boolean(site?.addresses)
      const isEthereumAuthorized = Boolean(site?.ethAddresses)
      const authorizedProviders = [
        ...(isPolkadotAuthorized ? ["polkadot"] : []),
        ...(isEthereumAuthorized ? ["ethereum"] : []),
      ] as ProviderType[]
      const defaultProvider = authorizedProviders[0]
      return { isPolkadotAuthorized, isEthereumAuthorized, authorizedProviders, defaultProvider }
    }, [site])

  return {
    isPolkadotAuthorized,
    isEthereumAuthorized,
    authorizedProviders,
    defaultProvider,
  }
}

export default useAuthorisedSiteProviders
