import useChain from "@ui/hooks/useChain"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useCallback, useMemo } from "react"
import urlJoin from "url-join"

import { useExplorerNetworkPickerModal } from "./useExplorerNetworkPickerModal"

const useChainByIdOrGenesisHash = (idOrGenesisHash: string | undefined) => {
  const chainById = useChain(idOrGenesisHash)
  const chainByGenesisHash = useChainByGenesisHash(idOrGenesisHash)

  return chainById ?? chainByGenesisHash ?? null
}

export const useViewOnExplorer = (address: string, networkIdOrHash?: string) => {
  const { open: openNetworkPickerModal } = useExplorerNetworkPickerModal()
  const chain = useChainByIdOrGenesisHash(networkIdOrHash)
  const evmNetwork = useEvmNetwork(networkIdOrHash)

  const blockExplorerUrl = useMemo(
    () => chain?.subscanUrl || evmNetwork?.explorerUrl || null,
    [chain, evmNetwork]
  )

  const canOpen = useMemo(
    () => !networkIdOrHash || blockExplorerUrl,
    [blockExplorerUrl, networkIdOrHash]
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
