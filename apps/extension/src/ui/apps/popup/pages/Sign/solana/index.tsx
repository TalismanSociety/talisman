import { SigningRequestID } from "extension-core"
import { Suspense, useEffect } from "react"
import { useParams } from "react-router-dom"

import { useRequest } from "@ui/state"

import { SignPopupShimmer } from "../SignPopupShimmer"
import { SolSignMessageRequest } from "./Message"
import { SolSignTransactionRequest } from "./Transaction"

export const SolanaSignRequest = () => {
  const { id } = useParams<"id">() as {
    id: SigningRequestID<"sol-sign">
  }
  const signingRequest = useRequest(id)

  useEffect(() => {
    if (!signingRequest) window.close()
  }, [signingRequest])

  if (!signingRequest) return null

  switch (signingRequest.request.type) {
    case "message":
      return <SolSignMessageRequest request={signingRequest} />
    case "transaction":
      return (
        <Suspense fallback={<SignPopupShimmer />}>
          <SolSignTransactionRequest request={signingRequest} />
        </Suspense>
      )
    default:
      return null
  }
}
