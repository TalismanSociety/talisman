import { getBlockExplorerUrls } from "@talismn/chaindata-provider"
import { useCallback, useMemo } from "react"

import { useNetworkByGenesisHash, useNetworkById } from "@ui/state"

import { useExplorerNetworkPickerModal } from "./useExplorerNetworkPickerModal"

const useChainByIdOrGenesisHash = (idOrGenesisHash: string | null | undefined) => {
  const networkById = useNetworkById(idOrGenesisHash)
  const chainByGenesisHash = useNetworkByGenesisHash(idOrGenesisHash as `0x${string}`)

  return networkById ?? chainByGenesisHash ?? null
}

export const useViewOnExplorer = (address: string, networkIdOrHash?: string | null) => {
  const { open: openNetworkPickerModal } = useExplorerNetworkPickerModal()
  const network = useChainByIdOrGenesisHash(networkIdOrHash)

  const blockExplorerUrl = useMemo(
    () =>
      network ? (getBlockExplorerUrls(network, { type: "address", address })[0] ?? null) : null,
    [address, network],
  )

  const canOpen = useMemo(
    () => !networkIdOrHash || blockExplorerUrl,
    [blockExplorerUrl, networkIdOrHash],
  )

  const open = useCallback(() => {
    if (blockExplorerUrl) {
      // only happens if account has a genesisHash
      window.open(blockExplorerUrl, "_blank")
    } else {
      openNetworkPickerModal({ address })
    }
  }, [address, blockExplorerUrl, openNetworkPickerModal])

  return {
    open,
    canOpen,
  }
}
