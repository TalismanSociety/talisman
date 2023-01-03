import type { AddEthereumChainRequest } from "@core/domains/ethereum/types"
import { useMemo } from "react"

import { useEthNetworkAddRequests } from "./useEthNetworkAddRequests"

export const useEthNetworkAddRequestById = (id?: string): AddEthereumChainRequest | undefined => {
  const requests = useEthNetworkAddRequests()
  return useMemo(() => requests.find((r) => r.id === id), [id, requests])
}
