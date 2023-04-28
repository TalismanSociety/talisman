import { useCallback, useMemo } from "react"
import { useLocalStorage } from "react-use"

import { provideContext } from "../../../common/provideContext"

export type NetworkConfig = {
  storageKey?: string
}

type NetworkStorageData = {
  wsUrl?: string
}

const DEFAULT_STORAGE_DATA: NetworkStorageData = {}

const useNetworkProvider = ({ storageKey = "useNetwork" }: NetworkConfig) => {
  const [data, setData] = useLocalStorage<NetworkStorageData>(storageKey, DEFAULT_STORAGE_DATA)

  const wsUrl = useMemo(() => data?.wsUrl, [data?.wsUrl])

  const setWsUrl = useCallback(
    (url?: string) => {
      setData({ wsUrl: url })
    },
    [setData]
  )

  return { wsUrl, setWsUrl }
}

export const [NetworkProvider, useNetwork] = provideContext(useNetworkProvider)
