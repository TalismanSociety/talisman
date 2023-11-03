import { db } from "@core/db"
import { HexString } from "@polkadot/util/types"
import { api } from "@ui/api"
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useMemo, useState } from "react"
import { useDebounce } from "react-use"

import useChains from "./useChains"

type ChainMetadata = {
  isReady: boolean
  isLoading: boolean
  isKnownChain: boolean
  hasMetadata: boolean
  isMetadataUpToDate: boolean
  isMetadataUpdating: boolean
  hasMetadataUpdateFailed: boolean
  requiresUpdate: boolean
  updateUrl?: string
}

const DEFAULT_VALUE: ChainMetadata = {
  isReady: false,
  isLoading: true,
  isKnownChain: false,
  hasMetadata: false,
  isMetadataUpToDate: false,
  isMetadataUpdating: false,
  hasMetadataUpdateFailed: false,
  requiresUpdate: false,
}

export const useMetadataUpdates = (genesisHash?: HexString, specVersion?: number) => {
  const [isMetadataUpdating, setIsMetadataUpdating] = useState(false)
  const [hasMetadataUpdated, setHasMetadataUpdated] = useState(false)

  const { chains } = useChains("all")
  const chain = useMemo(
    () => chains.find((c) => c.genesisHash === genesisHash) ?? null,
    [chains, genesisHash]
  )

  const metadata = useLiveQuery(
    () => (genesisHash ? db.metadata.get(genesisHash) : undefined),
    [genesisHash]
  )

  // listen for metadata updates from backend
  useEffect(() => {
    if (!genesisHash) return

    return api.metadataUpdatesSubscribe(genesisHash, ({ isUpdating }) => {
      setIsMetadataUpdating((prev) => {
        if (prev && !isUpdating) setHasMetadataUpdated(true)
        if (!prev && isUpdating) setHasMetadataUpdated(false)
        return isUpdating
      })
    })
  }, [genesisHash])

  // there is a short delay after a metadata update for the chain and metadata available here to be updated
  // debouncing prevents false positives
  const [result, setResult] = useState(DEFAULT_VALUE)
  useDebounce(
    () => {
      const hasMetadata = !!metadata
      const isMetadataUpToDate =
        specVersion === undefined ? !!metadata : metadata?.specVersion === specVersion
      const rpcUrl = chain?.rpcs?.[0]?.url
      const updateUrl = rpcUrl
        ? `https://polkadot.js.org/apps/?rpc=${encodeURIComponent(rpcUrl)}#/settings/metadata`
        : undefined

      const isLoading = !chains.length
      const isKnownChain = !!chain

      // consider ready to sign either if we can't update or if an update has been attempted.
      const isReady = !isLoading && (!chain || isMetadataUpToDate || hasMetadataUpdated)
      const hasMetadataUpdateFailed = hasMetadataUpdated && !isMetadataUpToDate
      const requiresUpdate = !isLoading && (!isKnownChain || !isMetadataUpToDate)

      setResult({
        isReady,
        isLoading,
        isKnownChain,
        hasMetadata,
        isMetadataUpToDate,
        isMetadataUpdating,
        hasMetadataUpdateFailed,
        updateUrl,
        requiresUpdate,
      })
    },
    1000,
    [chain, chains.length, hasMetadataUpdated, isMetadataUpdating, metadata, specVersion]
  )

  return result
}
