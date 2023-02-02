import { SignerPayloadRaw, SigningRequest } from "@core/domains/signing/types"
import { useSigningRequestById } from "@ui/hooks/useSigningRequestById"
import { useMemo } from "react"
import { useParams } from "react-router-dom"

import { PolkadotSignMessageRequest } from "./PolkadotSignMessageRequest"
import { PolkadotSignTransactionRequest } from "./PolkadotSignTransactionRequest"

export const SubstrateSignRequest = () => {
  const { id } = useParams<"id">() as { id: string }
  const signingRequest = useSigningRequestById(id) as SigningRequest | undefined

  const payloadType = useMemo(() => {
    const payload = signingRequest?.request?.payload
    if (!payload) return "unknown"
    if ((payload as SignerPayloadRaw).data) return "message"
    else return "transaction"
  }, [signingRequest?.request?.payload])

  if (!signingRequest) return null

  switch (payloadType) {
    case "transaction":
      return <PolkadotSignTransactionRequest signingRequest={signingRequest} />
    case "message":
      return <PolkadotSignMessageRequest signingRequest={signingRequest} />
    default:
      return null
  }
}
