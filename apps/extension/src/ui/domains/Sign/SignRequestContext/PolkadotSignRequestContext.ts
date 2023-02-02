import {
  SignerPayloadJSON,
  SigningRequest,
  TransactionDetails,
  TransactionPayload,
} from "@core/domains/signing/types"
import { log } from "@core/log"
import isJsonPayload from "@core/util/isJsonPayload"
import { HexString } from "@polkadot/util/types"
import { api } from "@ui/api"
import useChains from "@ui/hooks/useChains"
import { useChainMetadata } from "@ui/hooks/useMetadataUpdates"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

const usePolkadotTransactionDetails = (requestId?: string) => {
  const [analysing, setAnalysing] = useState(!!requestId)
  const [error, setError] = useState<string>()
  const [txDetails, setTxDetails] = useState<TransactionDetails>()

  // decode transaction payload
  useEffect(() => {
    setTxDetails(undefined)
    setError(undefined)
    setAnalysing(false)
    if (requestId) {
      setAnalysing(true)
      api
        .decodeSignRequest(requestId)
        .then(setTxDetails)
        .catch((err: Error) => setError(err.message))
        .finally(() => setAnalysing(false))
    }
  }, [requestId])

  return { analysing, txDetails, error }
}

export const usePolkadotTransaction = (signingRequest: SigningRequest) => {
  const { analysing, txDetails, error } = usePolkadotTransactionDetails(signingRequest.id)

  const { genesisHash, specVersion } = useMemo(() => {
    const payload = signingRequest?.request?.payload
    const isTx = payload && isJsonPayload(payload)
    if (isTx) {
      const { genesisHash, specVersion } = payload as TransactionPayload
      return {
        genesisHash,
        specVersion: parseInt(specVersion, 16),
      }
    }
    return { genesisHash: undefined, specVersion: undefined }
  }, [signingRequest])

  const {
    isLoading,
    isKnownChain,
    isMetadataUpToDate,
    isMetadataUpdating,
    hasMetadataUpdateFailed,
    updateUrl,
  } = useChainMetadata(genesisHash, specVersion)

  return {
    analysing,
    txDetails,
    error,
    requiresMetadataUpdate: !analysing && !isLoading && (!isKnownChain || !isMetadataUpToDate),
    isMetadataUpdating,
    hasMetadataUpdateFailed,
    updateUrl,
  }
}

export const usePolkadotSigningRequest = (signingRequest?: SigningRequest) => {
  const baseRequest = useAnySigningRequest<SigningRequest>({
    currentRequest: signingRequest,
    approveSignFn: api.approveSign,
    cancelSignFn: api.cancelSignRequest,
  })

  const chains = useChains()
  const chain = useMemo(() => {
    if (!signingRequest) return
    const { genesisHash } = (signingRequest?.request?.payload ?? {}) as SignerPayloadJSON
    return (genesisHash && (chains || []).find((c) => c.genesisHash === genesisHash)) || null
  }, [signingRequest, chains])

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      baseRequest.setStatus.processing("Approving request")
      if (!baseRequest || !baseRequest.id) return
      try {
        await api.approveSignHardware(baseRequest.id, signature)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.setStatus.error("Failed to approve sign request")
      }
    },
    [baseRequest]
  )

  return {
    ...baseRequest,
    chain,
    approveHardware,
    isLoading: !chains.length, // helps preventing chain name flickering
  }
}
