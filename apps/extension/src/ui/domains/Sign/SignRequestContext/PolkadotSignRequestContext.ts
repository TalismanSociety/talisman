import { SignerPayloadJSON, SigningRequest, TransactionDetails } from "@core/domains/signing/types"
import { HexString } from "@polkadot/util/types"
import { api } from "@ui/api"
import useChains from "@ui/hooks/useChains"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

export const usePolkadotTransactionDetails = (requestId?: string) => {
  const [analysing, setAnalysing] = useState(!!requestId)
  const [error, setError] = useState<string>()
  const [txDetails, setTxDetails] = useState<TransactionDetails | null>()

  // decode transaction payload
  useEffect(() => {
    const decode = async () => {
      setTxDetails(undefined)
      setError(undefined)
      if (requestId) {
        try {
          setAnalysing(true)
          const decoded = await api.decodeSignRequest(requestId)
          setTxDetails(decoded)
        } catch (err) {
          // non blocking
          if (err instanceof Error) setError(err.message)
        }
      }
      setAnalysing(false)
    }

    decode()
  }, [requestId])

  return { analysing, txDetails, error }
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
        baseRequest.setStatus.error("Failed to approve sign request")
      }
    },
    [baseRequest]
  )

  return {
    ...baseRequest,
    chain,
    approveHardware,
  }
}
