import { db } from "@extension/core"
import { HexString } from "@polkadot/util/types"
import { api } from "@ui/api"
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useMemo, useState } from "react"

import { useChainByGenesisHash } from "./useChainByGenesisHash"

const useMetadata = (genesisHash?: HexString) => {
  const metadata = useLiveQuery(
    async () => (genesisHash ? (await db.metadata.get(genesisHash)) ?? null : null),
    [genesisHash]
  )

  return { isLoaded: metadata !== undefined, metadata: metadata ?? null }
}

export const useMetadataUpdates = (genesisHash?: HexString, specVersion?: number) => {
  const chain = useChainByGenesisHash(genesisHash)

  const [isMetadataUpdating, setIsMetadataUpdating] = useState(false)
  const [hasMetadataUpdated, setHasMetadataUpdated] = useState(false)

  const { isLoaded, metadata } = useMetadata(genesisHash)

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

  return useMemo(() => {
    const isKnownChain = !!chain

    const isMetadataUpToDate =
      specVersion === undefined ? !!metadata : metadata?.specVersion === specVersion
    const hasMetadataUpdateFailed = hasMetadataUpdated && !isMetadataUpToDate

    const rpcUrl = chain?.rpcs?.[0]?.url
    const updateUrl = rpcUrl
      ? `https://polkadot.js.org/apps/?rpc=${encodeURIComponent(rpcUrl)}#/settings/metadata`
      : undefined

    const requiresUpdate = isLoaded && !isMetadataUpToDate

    return {
      isKnownChain,
      isMetadataUpdating,
      hasMetadataUpdateFailed,
      updateUrl,
      requiresUpdate,
    }
  }, [chain, hasMetadataUpdated, isLoaded, isMetadataUpdating, metadata, specVersion])
}
