import { DEFAULT_ETH_CHAIN_ID } from "@core/constants"
import {
  AuthorizedSite,
  AuthorizedSiteAddresses,
  AuthorizedSiteId,
  ProviderType,
} from "@core/domains/sitesAuthorised/types"
import { api } from "@ui/api"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useAccountAddresses } from "./useAccountAddresses"
import { useAuthorisedSites } from "./useAuthorisedSites"

const useAuthorisedSiteById = (id: AuthorizedSiteId, type: ProviderType) => {
  const sites = useAuthorisedSites()
  const availableAddresses = useAccountAddresses(type === "ethereum")

  const connected = useMemo(() => {
    const connectedPolkadot = sites[id]?.addresses ?? []
    const connectedEthereum = sites[id]?.ethAddresses ?? []

    switch (type) {
      case "polkadot":
        return connectedPolkadot
      case "ethereum":
        return connectedEthereum
      default:
        throw new Error("provider type not set")
    }
  }, [sites, id, type])

  const handleUpdate = useCallback(
    (newAddresses: AuthorizedSiteAddresses | undefined) => {
      const update: Partial<AuthorizedSite> = {}
      switch (type) {
        case "polkadot":
          update.addresses = newAddresses
          break
        case "ethereum":
          update.ethAddresses = newAddresses
          break
        default:
          throw new Error("provider type not set")
      }
      api.authorizedSiteUpdate(id, update)
    },
    [id, type]
  )

  const toggleOne = useCallback(
    (address: string) => {
      let newAddresses: string[]
      switch (type) {
        case "polkadot":
          newAddresses = connected.includes(address)
            ? connected.filter((a) => a !== address)
            : [...connected, address]
          break
        case "ethereum":
          newAddresses = connected.includes(address) ? [] : [address]
          break
        default:
          throw new Error("provider type not set")
      }
      return handleUpdate(newAddresses)
    },
    [connected, handleUpdate, type]
  )

  const toggleAll = useCallback(
    (on: boolean) => handleUpdate(on ? availableAddresses : []),
    [availableAddresses, handleUpdate]
  )

  const forget = useCallback(() => {
    if (!type) throw new Error("provider type not set")
    api.authorizedSiteForget(id, type)
  }, [id, type])

  const [ethChainId, setEthChainId] = useState(sites?.[id]?.ethChainId ?? DEFAULT_ETH_CHAIN_ID)

  useEffect(() => {
    setEthChainId(sites?.[id]?.ethChainId ?? DEFAULT_ETH_CHAIN_ID)
  }, [id, sites])

  const handleSetEthChainId = useCallback(
    (chainId: number) => {
      setEthChainId(chainId)
      api.authorizedSiteUpdate(id, { ethChainId: chainId })
    },
    [id]
  )

  return {
    ...sites[id],
    connected,
    availableAddresses,
    toggleOne,
    toggleAll,
    forget,
    ethChainId,
    setEthChainId: handleSetEthChainId,
  }
}

export default useAuthorisedSiteById
