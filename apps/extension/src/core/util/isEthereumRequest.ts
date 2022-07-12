import { AnySigningRequest, EthBaseSignRequest } from "@core/domains/signing/types"

export const isEthereumRequest = (
  signingRequest: AnySigningRequest
): signingRequest is EthBaseSignRequest => {
  return (
    (signingRequest as EthBaseSignRequest).type !== undefined &&
    (signingRequest as EthBaseSignRequest).type === "ethereum"
  )
}
