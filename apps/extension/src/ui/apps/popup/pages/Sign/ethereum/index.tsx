import { SigningRequestID } from "@extension/core"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import {
  EthSignMessageRequestProvider,
  EthSignTransactionRequestProvider,
} from "@ui/domains/Sign/SignRequestContext"
import { useRequest } from "@ui/hooks/useRequest"
import { Suspense } from "react"
import { useParams } from "react-router-dom"

import { SignPopupShimmer } from "../SignPopupShimmer"
import { EthSignMessageRequest } from "./Message"
import { EthSignTransactionRequest } from "./Transaction"

export const EthereumSignRequest = () => {
  const { id } = useParams<"id">() as {
    id: SigningRequestID<"eth-send"> | SigningRequestID<"eth-sign">
  }
  const signingRequest = useRequest(id)
  if (!signingRequest) return null

  switch (signingRequest.type) {
    case "eth-send":
      return (
        <Suspense
          fallback={
            <>
              <SignPopupShimmer />
              <SuspenseTracker name="EthereumSignRequest" />
            </>
          }
        >
          <EthSignTransactionRequestProvider id={signingRequest.id}>
            <EthSignTransactionRequest />
          </EthSignTransactionRequestProvider>
        </Suspense>
      )
    case "eth-sign":
      return (
        <EthSignMessageRequestProvider id={signingRequest.id}>
          <EthSignMessageRequest />
        </EthSignMessageRequestProvider>
      )
    default:
      return null
  }
}
