import { isAddressEqual } from "@talismn/crypto"
import {
  AuthorizedSite,
  AuthorizedSiteAddresses,
  AuthorizedSiteId,
  ProviderType,
} from "extension-core"
import { DEFAULT_ETH_CHAIN_ID } from "extension-shared"
import { useCallback, useEffect, useMemo, useState } from "react"

import { api } from "@ui/api"
import { useAuthorisedSites } from "@ui/state"

import { useInjectableAccounts } from "./useInjectableAccounts"

const isAddressIn = (addresses: string[]) => (address: string) =>
  addresses.some((addr) => isAddressEqual(address, addr))

const useAuthorisedSiteById = (id: AuthorizedSiteId, type: ProviderType) => {
  const sites = useAuthorisedSites()

  const injectableAccounts = useInjectableAccounts(sites[id]?.url ?? "", type)
  const availableAddresses = useMemo(
    () => injectableAccounts.map((account) => account.address),
    [injectableAccounts],
  )

  const connected = useMemo(() => {
    const connectedPolkadot = sites[id]?.addresses ?? []
    const connectedEthereum = sites[id]?.ethAddresses ?? []
    const connectedSolana = sites[id]?.solAddresses ?? []

    switch (type) {
      case "polkadot":
        return connectedPolkadot.filter(isAddressIn(availableAddresses))
      case "ethereum":
        return connectedEthereum.filter(isAddressIn(availableAddresses))
      case "solana":
        return connectedSolana.filter(isAddressIn(availableAddresses))
      default:
        throw new Error("provider type not set")
    }
  }, [sites, id, type, availableAddresses])

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
        case "solana":
          update.solAddresses = newAddresses
          break
        default:
          throw new Error("provider type not set")
      }
      api.authorizedSiteUpdate(id, update)
    },
    [id, type],
  )

  const toggleOne = useCallback(
    (address: string) => {
      let newAddresses: string[]
      const isConnectedAddress = isAddressIn(connected)
      switch (type) {
        case "polkadot":
          newAddresses = isConnectedAddress(address)
            ? connected.filter((a) => !isAddressEqual(a, address))
            : [...connected, address]
          break
        case "ethereum":
          newAddresses = isConnectedAddress(address) ? [] : [address]
          break
        case "solana":
          newAddresses = isConnectedAddress(address) ? [] : [address]
          break
        default:
          throw new Error("provider type not set")
      }
      return handleUpdate(newAddresses)
    },
    [connected, handleUpdate, type],
  )

  const toggleAll = useCallback(
    (on: boolean) => handleUpdate(on ? availableAddresses : []),
    [availableAddresses, handleUpdate],
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
    [id],
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
