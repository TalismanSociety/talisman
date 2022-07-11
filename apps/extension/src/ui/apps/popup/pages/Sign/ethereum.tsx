import { AnyEthSigningRequest } from "@core/domains/signing/types"
import {
  EthSignMessageRequestProvider,
  EthSignTransactionRequestProvider,
} from "@ui/domains/Sign/SignRequestContext"
import useSigningRequestById from "@ui/hooks/useSigningRequestById"
import { useParams } from "react-router-dom"

import { EthSignMessageRequest } from "./EthSignMessageRequest"
import { EthSignTransactionRequest } from "./EthSignTransactionRequest"

export const EthereumSignRequest = () => {
  const { id } = useParams<"id">() as { id: string }
  const signingRequest = useSigningRequestById(id) as AnyEthSigningRequest | undefined

  if (signingRequest?.method === "eth_sendTransaction")
    return (
      <EthSignTransactionRequestProvider id={id}>
        <EthSignTransactionRequest />
      </EthSignTransactionRequestProvider>
    )

  // all other eth methods
  if (signingRequest?.method)
    return (
      <EthSignMessageRequestProvider id={id}>
        <EthSignMessageRequest />
      </EthSignMessageRequestProvider>
    )

  // signing request not loaded yet
  return null
}
