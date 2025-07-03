import { useCallback, useMemo } from "react"
import urlJoin from "url-join"

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

  const blockExplorerUrl = useMemo(() => network?.blockExplorerUrls[0] || null, [network])

  const canOpen = useMemo(
    () => !networkIdOrHash || blockExplorerUrl,
    [blockExplorerUrl, networkIdOrHash],
  )

  const open = useCallback(() => {
    if (blockExplorerUrl) {
      window.open(urlJoin(blockExplorerUrl, "address", address), "_blank")
    } else {
      openNetworkPickerModal({ address })
    }
  }, [address, blockExplorerUrl, openNetworkPickerModal])

  return {
    blockExplorerUrl,
    open,
    canOpen,
  }
}
