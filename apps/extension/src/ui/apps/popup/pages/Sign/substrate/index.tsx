import { KnownSigningRequestIdOnly } from "@core/domains/signing/types"
import { isJsonPayload } from "@core/util/isJsonPayload"
import { PolkadotSigningRequestProvider } from "@ui/domains/Sign/SignRequestContext"
import { useRequest } from "@ui/hooks/useRequest"
import { useMemo } from "react"
import { useParams } from "react-router-dom"

import { PolkadotSignMessageRequest } from "./Message"
import { PolkadotSignTransactionRequest } from "./Transaction"

export const SubstrateSignRequest = () => {
  const { id } = useParams() as KnownSigningRequestIdOnly<"substrate-sign">
  const signingRequest = useRequest(id)

  const payloadType = useMemo(() => {
    const payload = signingRequest?.request?.payload
    if (!payload) return "unknown"
    return isJsonPayload(payload) ? "transaction" : "message"
  }, [signingRequest?.request?.payload])

  if (!signingRequest) return null

  switch (payloadType) {
    case "transaction":
      return (
        <PolkadotSigningRequestProvider signingRequest={signingRequest}>
          <PolkadotSignTransactionRequest />
        </PolkadotSigningRequestProvider>
      )

    case "message":
      return (
        <PolkadotSigningRequestProvider signingRequest={signingRequest}>
          <PolkadotSignMessageRequest />
        </PolkadotSigningRequestProvider>
      )
    default:
      throw new Error("Unknown signing request type")
  }
}
